import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'E-mail do usuário', example: 'admin@demo.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @ApiProperty({ description: 'Senha de acesso', example: 'senha123' })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  password: string;

  @ApiPropertyOptional({
    description: 'ID da empresa para sessão ativa (opcional caso o usuário tenha apenas uma)',
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}
