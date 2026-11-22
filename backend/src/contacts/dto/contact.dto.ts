import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Nome ou razão social do cliente', example: 'Supermercado Central' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ', example: '98.765.432/0001-10' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ description: 'E-mail do cliente' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Endereço completo' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateSupplierDto {
  @ApiProperty({ description: 'Nome ou razão social do fornecedor', example: 'Distribuidora Alimentos S/A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'CNPJ do fornecedor' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ description: 'E-mail de contato' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Endereço' })
  @IsOptional()
  @IsString()
  address?: string;
}
