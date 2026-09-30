import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para atualizar um item do cardápio.
 *
 * CONCEITO: Partial DTO
 * Todos os campos são opcionais (@IsOptional) porque o PATCH
 * atualiza parcialmente — só os campos enviados são alterados.
 * Diferente do PUT, que exigiria TODOS os campos.
 */
export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
