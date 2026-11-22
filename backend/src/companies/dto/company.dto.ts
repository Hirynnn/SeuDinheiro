import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: 'Nome fantasia' })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiPropertyOptional({ description: 'Telefone de contato' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Endereço da sede' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'E-mail de contato' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class AddMemberDto {
  @ApiProperty({ description: 'E-mail do usuário a ser adicionado' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Nome do usuário (se ainda não existir na plataforma)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Nome do papel atribuído (ADMIN, FINANCEIRO, OPERADOR, VISUALIZADOR)', example: 'FINANCEIRO' })
  @IsString()
  @IsNotEmpty()
  roleName: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ description: 'Novo papel do membro', example: 'OPERADOR' })
  @IsString()
  @IsNotEmpty()
  roleName: string;
}
