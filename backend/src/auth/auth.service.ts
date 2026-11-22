import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Cadastro completo de nova Empresa + Administrador Inicial (Transacional)
   */
  async registerCompany(dto: RegisterCompanyDto) {
    const cleanCnpj = dto.cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new BadRequestException('CNPJ deve conter 14 dígitos válidos.');
    }

    const existingCompany = await this.prisma.company.findUnique({
      where: { cnpj: cleanCnpj },
    });
    if (existingCompany) {
      throw new ConflictException('Já existe uma empresa cadastrada com este CNPJ.');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail.toLowerCase() },
    });

    const passwordHash = await argon2.hash(dto.adminPassword);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Criar ou atualizar usuário
      if (!user) {
        user = await tx.user.create({
          data: {
            email: dto.adminEmail.toLowerCase(),
            name: dto.adminName,
            passwordHash,
            emailVerifiedAt: new Date(),
          },
        });
      }

      // 2. Criar a empresa
      const company = await tx.company.create({
        data: {
          legalName: dto.legalName,
          tradeName: dto.tradeName || dto.legalName,
          cnpj: cleanCnpj,
          phone: dto.phone,
          address: dto.address,
          email: dto.adminEmail.toLowerCase(),
          defaultCurrency: 'BRL',
        },
      });

      // 3. Criar os papéis do sistema para a empresa
      const roleAdmin = await tx.role.create({
        data: { companyId: company.id, name: 'ADMIN', isSystem: true },
      });
      await tx.role.create({
        data: { companyId: company.id, name: 'FINANCEIRO', isSystem: true },
      });
      await tx.role.create({
        data: { companyId: company.id, name: 'OPERADOR', isSystem: true },
      });
      await tx.role.create({
        data: { companyId: company.id, name: 'VISUALIZADOR', isSystem: true },
      });

      // 4. Vincular todas as permissões ao papel ADMIN
      const allPermissions = await tx.permission.findMany();
      if (allPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: allPermissions.map((p) => ({
            roleId: roleAdmin.id,
            permissionId: p.id,
          })),
        });
      }

      // 5. Vincular usuário como membro ADMIN da nova empresa
      await tx.companyMember.create({
        data: {
          userId: user.id,
          companyId: company.id,
          roleId: roleAdmin.id,
          isActive: true,
        },
      });

      // 6. Criar categorias financeiras padrão para a empresa
      const defaultCategories = [
        { name: 'Vendas', type: 'REVENUE' as const },
        { name: 'Serviços Prestados', type: 'REVENUE' as const },
        { name: 'Rendimentos', type: 'REVENUE' as const },
        { name: 'Outras Receitas', type: 'REVENUE' as const },
        { name: 'Aluguel & Condomínio', type: 'EXPENSE' as const },
        { name: 'Salários & Pró-labore', type: 'EXPENSE' as const },
        { name: 'Fornecedores & Insumos', type: 'EXPENSE' as const },
        { name: 'Impostos & Tributos', type: 'EXPENSE' as const },
        { name: 'Tecnologia & Softwares', type: 'EXPENSE' as const },
        { name: 'Marketing & Vendas', type: 'EXPENSE' as const },
        { name: 'Transporte & Logística', type: 'EXPENSE' as const },
        { name: 'Outras Despesas', type: 'EXPENSE' as const },
      ];
      await tx.category.createMany({
        data: defaultCategories.map((c) => ({
          companyId: company.id,
          name: c.name,
          type: c.type,
        })),
      });

      // 7. Criar conta financeira padrão (Conta Corrente)
      await tx.financialAccount.create({
        data: {
          companyId: company.id,
          name: 'Conta Corrente Principal',
          type: 'CHECKING',
          initialBalance: 0,
          currentBalance: 0,
          currency: 'BRL',
        },
      });

      return { company, user, role: 'ADMIN' };
    });

    const tokens = await this.generateTokens(result.user.id, result.user.email, result.company.id, 'ADMIN');

    return {
      message: 'Empresa e administrador cadastrados com sucesso!',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      company: {
        id: result.company.id,
        tradeName: result.company.tradeName,
        cnpj: result.company.cnpj,
      },
      ...tokens,
    };
  }

  /**
   * Login com verificação de bloqueio por tentativas (anti-brute force) e JWT
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            company: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Verificar bloqueio por tentativas excessivas
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      throw new ForbiddenException(
        `Conta temporariamente bloqueada por segurança. Tente novamente em ${waitMinutes} minuto(s).`,
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      const attempts = user.loginAttempts + 1;
      const lockData: { loginAttempts: number; lockedUntil?: Date } = {
        loginAttempts: attempts,
      };

      if (attempts >= 5) {
        lockData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: lockData,
      });

      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Resetar tentativas de login com sucesso
    if (user.loginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockedUntil: null },
      });
    }

    // Resolver a empresa ativa
    let selectedMembership = user.memberships[0];
    if (dto.companyId) {
      selectedMembership = user.memberships.find(
        (m) => m.companyId === dto.companyId,
      );
      if (!selectedMembership) {
        throw new ForbiddenException('Usuário não tem acesso à empresa solicitada.');
      }
    }

    const activeCompanyId = selectedMembership?.companyId;
    const activeRole = selectedMembership?.role.name;

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      activeCompanyId,
      activeRole,
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      activeCompany: selectedMembership
        ? {
            id: selectedMembership.company.id,
            tradeName: selectedMembership.company.tradeName || selectedMembership.company.legalName,
            role: selectedMembership.role.name,
          }
        : null,
      availableCompanies: user.memberships.map((m) => ({
        id: m.company.id,
        tradeName: m.company.tradeName || m.company.legalName,
        cnpj: m.company.cnpj,
        role: m.role.name,
      })),
      ...tokens,
    };
  }

  /**
   * Rotação segura de Refresh Token
   */
  async refreshToken(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              where: { isActive: true },
              include: { role: true },
            },
          },
        },
      },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    // Revoga o token atual (rotação)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const user = storedToken.user;
    const primaryMembership = user.memberships[0];

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      primaryMembership?.companyId,
      primaryMembership?.role.name,
    );

    return tokens;
  }

  /**
   * Logout seguro revogando o Refresh Token
   */
  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Sessão encerrada com sucesso.' };
  }

  /**
   * Alteração de senha
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const currentMatches = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!currentMatches) {
      throw new BadRequestException('A senha atual fornecida está incorreta.');
    }

    const newHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      // Revogar todos os refresh tokens anteriores do usuário
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Senha alterada com sucesso. Faça login novamente em suas outras sessões.' };
  }

  /**
   * Perfil completo do usuário autenticado
   */
  async getProfile(userId: string, activeCompanyId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: {
          where: { isActive: true },
          include: {
            company: {
              select: {
                id: true,
                legalName: true,
                tradeName: true,
                cnpj: true,
                defaultCurrency: true,
              },
            },
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const activeMembership = activeCompanyId
      ? user.memberships.find((m) => m.companyId === activeCompanyId)
      : user.memberships[0];

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      activeCompany: activeMembership
        ? {
            id: activeMembership.company.id,
            tradeName: activeMembership.company.tradeName || activeMembership.company.legalName,
            legalName: activeMembership.company.legalName,
            cnpj: activeMembership.company.cnpj,
            currency: activeMembership.company.defaultCurrency,
            role: activeMembership.role.name,
            permissions: activeMembership.role.permissions.map((p) => p.permission.code),
          }
        : null,
      companies: user.memberships.map((m) => ({
        id: m.company.id,
        name: m.company.tradeName || m.company.legalName,
        cnpj: m.company.cnpj,
        role: m.role.name,
      })),
    };
  }

  /**
   * Gerador de par de tokens (JWT + Refresh Token com Hash)
   */
  private async generateTokens(
    userId: string,
    email: string,
    companyId?: string,
    role?: string,
  ) {
    const payload = { sub: userId, email, companyId, role };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900, // 15 minutos em segundos
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
