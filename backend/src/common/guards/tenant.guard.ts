import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    // Identificar a empresa a partir do header x-company-id ou do payload do token
    const requestedCompanyId =
      (request.headers['x-company-id'] as string) || user.companyId;

    if (!requestedCompanyId) {
      // Para certas rotas de usuário (como listar suas empresas ou perfil), companyId pode não ser obrigatório
      return true;
    }

    // Validar se o usuário é membro ativo da empresa requisitada
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: requestedCompanyId,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        company: true,
      },
    });

    if (!membership || !membership.isActive || !membership.company.isActive) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para acessar esta empresa.',
      );
    }

    // Injeta na requisição os dados resolvidos do tenant
    request.companyId = requestedCompanyId;
    request.company = membership.company;
    request.companyRole = membership.role.name;
    request.permissions = membership.role.permissions.map(
      (rp) => rp.permission.code,
    );

    // Atualiza o objeto user com a role e permissões da empresa ativa
    request.user.companyId = requestedCompanyId;
    request.user.role = membership.role.name;
    request.user.permissions = request.permissions;

    return true;
  }
}
