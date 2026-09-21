import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrdersGateway } from './orders.gateway';
import { OrderStatus } from '@delivery-hub/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * OrdersController — Endpoints REST para pedidos.
 *
 * CONCEITOS REST:
 * - POST  /orders            → Criar pedido (201 Created)
 * - GET   /orders/my         → Meus pedidos como cliente
 * - GET   /orders/:id        → Detalhes de um pedido
 * - PATCH /orders/:id/status → Atualizar status (ação no recurso)
 *
 * CONCEITO IMPORTANTE:
 * O POST cria o pedido via REST, mas a NOTIFICAÇÃO ao restaurante
 * é feita via WebSocket.
 * - REST: Persiste dados (source of truth)
 * - WebSocket: Notifica em tempo real (evento efêmero)
 */
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersGateway: OrdersGateway,
  ) { }

  @Post()
  async create(
    @Body() dto: CreateOrderDto,
  ) {
    // hardcoded para simular a criação do usuário
    const userId = 'user-123';

    const order = await this.ordersService.create(userId, dto);

    this.ordersGateway.emitNewOrder(dto.restaurantId, order);

    return order;
  }

  @Get('my')
  async getMyOrders(@CurrentUser('userId') userId: string) {
    return this.ordersService.findByCustomer(userId);
  }

  @Get('restaurant/:restaurantId')
  async getRestaurantOrders(
    @Param('restaurantId') restaurantId: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findByRestaurant(restaurantId, status);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {

    const order = await this.ordersService.updateStatus(id, dto.status, dto.note);


    this.ordersGateway.emitOrderStatusChanged(id, dto.status, dto.note);

    return order;
  }
}
