import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountingAccountType, NormalBalance } from '@prisma/client';

export class CreateAccountingAccountDto {
  @ApiProperty({ description: 'Código contábil hierárquico', example: '1.1.03' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Nome da conta contábil', example: 'Aplicações de Liquidez Imediata' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: AccountingAccountType, example: 'ASSET' })
  @IsEnum(AccountingAccountType)
  type: AccountingAccountType;

  @ApiProperty({ enum: NormalBalance, example: 'DEBIT' })
  @IsEnum(NormalBalance)
  normalBalance: NormalBalance;

  @ApiPropertyOptional({ description: 'ID da conta contábil pai' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class AccountingEntryLineDto {
  @ApiProperty({ description: 'ID da conta contábil' })
  @IsString()
  @IsNotEmpty()
  accountingAccountId: string;

  @ApiProperty({ description: 'Valor monetário da linha', example: 1500.0 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'true = Crédito, false = Débito', example: false })
  @IsBoolean()
  isCredit: boolean;
}

export class CreateAccountingEntryDto {
  @ApiProperty({ description: 'Histórico/descrição contábil', example: 'Reconhecimento de prestação de serviços a prazo' })
  @IsString()
  @IsNotEmpty()
  memo: string;

  @ApiPropertyOptional({ description: 'Número do documento ou nota fiscal de referência' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'ID da transação operacional vinculada (opcional)' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({
    description: 'Linhas contábeis (a soma dos débitos deve ser rigorosamente igual à dos créditos)',
    type: [AccountingEntryLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountingEntryLineDto)
  lines: AccountingEntryLineDto[];
}
