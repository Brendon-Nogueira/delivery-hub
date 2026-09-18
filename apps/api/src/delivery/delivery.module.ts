import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeliveryGateway } from './delivery.gateway';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';

@Module({
  imports: [AuthModule],
  controllers: [DeliveryController],
  providers: [DeliveryGateway, DeliveryService],
  exports: [DeliveryGateway, DeliveryService],
})
export class DeliveryModule {}
