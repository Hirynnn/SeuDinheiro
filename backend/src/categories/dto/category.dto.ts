import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nome da categoria', example: 'Consultoria' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Tipo da categoria', enum: CategoryType, example: 'REVENUE' })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({ description: 'Descrição da categoria' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Nome da categoria' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Descrição da categoria' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Se a categoria está ativa' })
  @IsOptional()
  isActive?: boolean;
}
