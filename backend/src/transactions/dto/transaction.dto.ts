import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus, TransactionType } from '@prisma/client';

export class InstallmentInputDto {
  @ApiProperty({ description: 'Número da parcela', example: 1 })
  @IsNumber()
  installmentNumber: number;

  @ApiProperty({ description: 'Valor da parcela', example: 250.0 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Data de vencimento (YYYY-MM-DD)', example: '2026-12-10' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;
}

export class CreateTransactionDto {
  @ApiProperty({ description: 'Tipo do lançamento', enum: TransactionType, example: 'EXPENSE' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Descrição do lançamento', example: 'Licença de Software de Design' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Valor monetário total', example: 500.0 })
  @IsNumber()
  @Min(0.01, { message: 'O valor deve ser maior que zero' })
  amount: number;

  @ApiProperty({ description: 'ID da conta financeira vinculada' })
  @IsString()
  @IsNotEmpty()
  financialAccountId: string;

  @ApiPropertyOptional({ description: 'ID da categoria financeira' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'ID do cliente (para receitas)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'ID do fornecedor (para despesas)' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ description: 'Data de competência contábil (YYYY-MM-DD)', example: '2026-11-20' })
  @IsString()
  @IsNotEmpty()
  competenceDate: string;

  @ApiProperty({ description: 'Data de vencimento (YYYY-MM-DD)', example: '2026-11-30' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({
    description: 'Status inicial (default: PENDING)',
    enum: TransactionStatus,
    example: 'PENDING',
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Data em que foi efetivado/pago (obrigatório se status for PAID ou RECEIVED)',
    example: '2026-11-22',
  })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Observações adicionais' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Parcelamento opcional da despesa/receita',
    type: [InstallmentInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentInputDto)
  installments?: InstallmentInputDto[];
}

export class SettleTransactionDto {
  @ApiProperty({ description: 'Data em que o pagamento/recebimento foi efetivado', example: '2026-11-22' })
  @IsString()
  @IsNotEmpty()
  paymentDate: string;

  @ApiPropertyOptional({ description: 'Conta de liquidação (se diferente da conta original)' })
  @IsOptional()
  @IsString()
  financialAccountId?: string;

  @ApiPropertyOptional({ description: 'Valor liquidado (se pagamento parcial)' })
  @IsOptional()
  @IsNumber()
  settledAmount?: number;
}
