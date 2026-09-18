import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
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

  @IsEnum(UserRole, { message: 'Role deve ser: CUSTOMER, RESTAURANT_OWNER, DRIVER ou ADMIN' })
  role: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;
}
