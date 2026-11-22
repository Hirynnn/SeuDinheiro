import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterCompanyDto {
  @ApiProperty({ description: 'Razão social da empresa', example: 'Minha Empresa Ltda' })
  @IsString({ message: 'Razão social deve ser um texto' })
  @IsNotEmpty({ message: 'Razão social é obrigatória' })
  legalName: string;

  @ApiPropertyOptional({ description: 'Nome fantasia', example: 'Minha Empresa' })
  @IsOptional()
  @IsString({ message: 'Nome fantasia deve ser um texto' })
  tradeName?: string;

  @ApiProperty({ description: 'CNPJ (apenas números ou formatado)', example: '12.345.678/0001-99' })
  @IsString({ message: 'CNPJ deve ser um texto' })
  @IsNotEmpty({ message: 'CNPJ é obrigatório' })
  cnpj: string;

  @ApiPropertyOptional({ description: 'Telefone da empresa', example: '(11) 98765-4321' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Endereço da empresa' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Nome do administrador', example: 'Carlos Silva' })
  @IsString({ message: 'Nome do usuário deve ser um texto' })
  @IsNotEmpty({ message: 'Nome do usuário é obrigatório' })
  adminName: string;

  @ApiProperty({ description: 'E-mail do administrador', example: 'admin@minhaempresa.com' })
  @IsEmail({}, { message: 'E-mail informado é inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  adminEmail: string;

  @ApiProperty({ description: 'Senha de acesso (mínimo 8 caracteres)', example: 'SenhaForte@123' })
  @IsString()
  @MinLength(8, { message: 'A senha deve conter no mínimo 8 caracteres' })
  adminPassword: string;
}
