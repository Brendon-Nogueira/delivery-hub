import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { OrdersResolver } from './orders.resolver';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Para JwtService no Gateway
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway, OrdersResolver],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
