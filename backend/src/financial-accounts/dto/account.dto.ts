import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { FinancialAccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({ description: 'Nome descritivo da conta', example: 'Conta Corrente Bradesco' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Tipo da conta',
    enum: FinancialAccountType,
    example: 'CHECKING',
  })
  @IsEnum(FinancialAccountType)
  type: FinancialAccountType;

  @ApiPropertyOptional({ description: 'Saldo inicial em reais', example: 1000.0 })
  @IsOptional()
  @IsNumber()
  initialBalance?: number;

  @ApiPropertyOptional({ description: 'Moeda da conta', example: 'BRL', default: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: 'Nome descritivo da conta' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Se a conta está arquivada' })
  @IsOptional()
  isArchived?: boolean;
}

export class TransferBetweenAccountsDto {
  @ApiProperty({ description: 'ID da conta de origem' })
  @IsString()
  @IsNotEmpty()
  sourceAccountId: string;

  @ApiProperty({ description: 'ID da conta de destino' })
  @IsString()
  @IsNotEmpty()
  destinationAccountId: string;

  @ApiProperty({ description: 'Valor a transferir', example: 500.0 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Data da transferência (YYYY-MM-DD)' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Observação ou motivo' })
  @IsOptional()
  @IsString()
  notes?: string;
}
