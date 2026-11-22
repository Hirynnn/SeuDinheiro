import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentCompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const companyId = request.companyId || request.user?.companyId;
    if (!companyId) {
      throw new UnauthorizedException(
        'Nenhuma empresa selecionada para esta operação.',
      );
    }
    return companyId;
  },
);
