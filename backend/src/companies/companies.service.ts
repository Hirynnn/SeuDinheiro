import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto, UpdateCompanyDto, UpdateMemberRoleDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            members: { where: { isActive: true } },
            financialAccounts: { where: { isArchived: false } },
            transactions: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return company;
  }

  async updateCurrentCompany(companyId: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: dto,
    });
  }

  async listMembers(companyId: string) {
    return this.prisma.companyMember.findMany({
      where: { companyId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            isSystem: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(companyId: string, dto: AddMemberDto) {
    const email = dto.email.toLowerCase();

    const role = await this.prisma.role.findUnique({
      where: {
        companyId_name: {
          companyId,
          name: dto.roleName.toUpperCase(),
        },
      },
    });

    if (!role) {
      throw new BadRequestException(
        `Papel '${dto.roleName}' não encontrado para esta empresa.`,
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Cria o usuário com uma senha temporária segura
      const tempPassword = crypto.randomBytes(8).toString('hex') + '@A1';
      const passwordHash = await argon2.hash(tempPassword);

      user = await this.prisma.user.create({
        data: {
          email,
          name: dto.name || email.split('@')[0],
          passwordHash,
        },
      });
    }

    const existingMember = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
    });

    if (existingMember && existingMember.isActive) {
      throw new ConflictException('Usuário já é membro ativo desta empresa.');
    }

    if (existingMember && !existingMember.isActive) {
      return this.prisma.companyMember.update({
        where: { id: existingMember.id },
        data: { isActive: true, roleId: role.id },
        include: { user: true, role: true },
      });
    }

    return this.prisma.companyMember.create({
      data: {
        userId: user.id,
        companyId,
        roleId: role.id,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        role: true,
      },
    });
  }

  async updateMemberRole(
    companyId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    requesterUserId: string,
  ) {
    const member = await this.prisma.companyMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.companyId !== companyId) {
      throw new NotFoundException('Membro não encontrado.');
    }

    if (member.userId === requesterUserId) {
      throw new ForbiddenException(
        'Você não pode alterar seu próprio papel administrativo.',
      );
    }

    const role = await this.prisma.role.findUnique({
      where: {
        companyId_name: {
          companyId,
          name: dto.roleName.toUpperCase(),
        },
      },
    });

    if (!role) {
      throw new BadRequestException(`Papel '${dto.roleName}' inválido.`);
    }

    return this.prisma.companyMember.update({
      where: { id: memberId },
      data: { roleId: role.id },
      include: { user: true, role: true },
    });
  }

  async removeMember(companyId: string, memberId: string, requesterUserId: string) {
    const member = await this.prisma.companyMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.companyId !== companyId) {
      throw new NotFoundException('Membro não encontrado.');
    }

    if (member.userId === requesterUserId) {
      throw new ForbiddenException('Você não pode remover a si mesmo da empresa.');
    }

    // Desativação lógica do membro
    await this.prisma.companyMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });

    return { message: 'Membro desativado com sucesso.' };
  }
}
