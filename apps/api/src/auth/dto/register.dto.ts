import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@delivery-hub/shared';

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsIn([UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER], {
    message: 'Função inválida para autorregistro. Contas administrativas não podem ser criadas por esta rota.',
  })
  role: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;
}
