import { IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@delivery-hub/shared';

export class UpdateOrderStatusDto {
  @IsString()
  status: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

