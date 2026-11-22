import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus, TransactionType } from '@prisma/client';

export class QueryTransactionDto {
  @ApiPropertyOptional({ description: 'Filtrar por tipo', enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ description: 'Filtrar por status', enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ description: 'Filtrar por conta financeira' })
  @IsOptional()
  @IsString()
  financialAccountId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoria' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Busca por texto na descrição' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Data inicial de competência (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final de competência (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Data inicial de vencimento' })
  @IsOptional()
  @IsString()
  dueStartDate?: string;

  @ApiPropertyOptional({ description: 'Data final de vencimento' })
  @IsOptional()
  @IsString()
  dueEndDate?: string;

  @ApiPropertyOptional({ description: 'Página (default 1)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página (default 20)', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}
