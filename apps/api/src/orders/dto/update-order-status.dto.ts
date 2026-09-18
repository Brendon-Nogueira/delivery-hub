import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@delivery-hub/shared';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
