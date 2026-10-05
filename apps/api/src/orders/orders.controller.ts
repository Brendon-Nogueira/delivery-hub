import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrdersGateway } from './orders.gateway';
import { OrderStatus, UserRole } from '@delivery-hub/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * OrdersController — Endpoints REST para pedidos.
 */
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersGateway: OrdersGateway,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    const order = await this.ordersService.create(userId, dto);
    this.ordersGateway.emitNewOrder(dto.restaurantId, order);
    return order;
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@CurrentUser('userId') userId: string) {
    return this.ordersService.findByCustomer(userId);
  }

  /**
   * Apenas o RESTAURANT_OWNER do próprio restaurante ou ADMIN pode ver métricas.
   */
  @Get('restaurant/:restaurantId/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  async getRestaurantStats(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: { userId: string; role: UserRole },
  ) {
    return this.ordersService.getRestaurantStats(restaurantId, user);
  }

  /**
   * Protegido por JWT e verificação de propriedade do restaurante.
   */
  @Get('restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  async getRestaurantOrders(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: { userId: string; role: UserRole },
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findByRestaurant(restaurantId, status, user);
  }

  /**
   * Exclusão restrita a RESTAURANT_OWNER ou ADMIN.
   */
  @Delete('clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  async clearOrders(
    @CurrentUser() user: { userId: string; role: UserRole },
    @Query('restaurantId') restaurantId?: string,
  ) {
    return this.ordersService.clearAllOrders(user, restaurantId);
  }

  @Get('available-deliveries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async getAvailableDeliveries() {
    return this.ordersService.findAvailableForDelivery();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: UserRole },
  ) {
    const order = await this.ordersService.findById(id);

    // Apenas partes envolvidas ou ADMIN podem ver
    const isOwner = order.restaurant?.ownerId === user.userId;
    const isCustomer = order.customerId === user.userId;
    const isDriver = user.role === UserRole.DRIVER;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isCustomer && !isDriver && !isAdmin) {
      throw new ForbiddenException('Acesso não autorizado aos detalhes deste pedido.');
    }

    return order;
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: UserRole; email: string },
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatusWithAuth(id, dto.status, user, dto.note);

    this.ordersGateway.emitOrderStatusChanged(
      id,
      dto.status as OrderStatus,
      dto.note,
      order.restaurantId,
      order.customerId,
    );

    return order;
  }
}
