import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@delivery-hub/shared';
import { Decimal } from '@prisma/client/runtime/library';



@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Cria um novo pedido.
   * 
   * Usa transação Prisma para garantir atomicidade:
   * 1. Busca preços dos itens no menu
   * 2. Calcula total
   * 3. Cria o pedido + itens + histórico de status
   * Tudo ou nada (ACID).
   */
  async create(customerId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {

      const menuItems = await tx.menuItem.findMany({
        where: {
          id: { in: dto.items.map((i) => i.menuItemId) },
          restaurantId: dto.restaurantId,
          isAvailable: true,
        },
      });

      if (menuItems.length !== dto.items.length) {
        throw new BadRequestException('Um ou mais itens não estão disponíveis');
      }


      const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi]));
      let totalPrice = new Decimal(0);

      const orderItemsData = dto.items.map((item) => {
        const menuItem = menuItemMap.get(item.menuItemId)!;
        const itemTotal = menuItem.price.mul(item.quantity);
        totalPrice = totalPrice.add(itemTotal);

        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
        };
      });


      const order = await tx.order.create({
        data: {
          customerId,
          restaurantId: dto.restaurantId,
          totalPrice,
          notes: dto.notes,
          items: {
            create: orderItemsData,
          },
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              note: 'Pedido criado pelo cliente',
            },
          },
        },
        include: {
          items: {
            include: { menuItem: true },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
          restaurant: {
            select: { id: true, name: true },
          },
        },
      });

      this.logger.log(`Novo pedido criado: ${order.id} (R$ ${totalPrice})`);

      return order;
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        customer: { select: { id: true, name: true, phone: true } },
        restaurant: { select: { id: true, name: true, address: true } },
        driver: { select: { id: true, name: true, phone: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) throw new NotFoundException(`Pedido ${id} não encontrado`);
    return order;
  }

  async findByCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        restaurant: { select: { id: true, name: true } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRestaurant(restaurantId: string, status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        ...(status && { status: status as any }),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retorna todos os pedidos prontos para coleta ou em trânsito para entregadores
   */
  async findAvailableForDelivery() {
    return this.prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.PICKED_UP,
            OrderStatus.IN_TRANSIT,
          ],
        },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Padroniza aliases de status comuns para o enum oficial OrderStatus
   */
  private normalizeStatus(rawStatus: OrderStatus | string): OrderStatus {
    const map: Record<string, OrderStatus> = {
      READY: OrderStatus.READY_FOR_PICKUP,
      ON_THE_WAY: OrderStatus.IN_TRANSIT,
      OUT_FOR_DELIVERY: OrderStatus.IN_TRANSIT,
    };
    return (map[rawStatus as string] || rawStatus) as OrderStatus;
  }

  /**
   * Atualiza o status de um pedido.
   * Registra o histórico de mudança de status para auditoria.
   */
  async updateStatus(orderId: string, rawStatus: OrderStatus | string, note?: string) {
    const status = this.normalizeStatus(rawStatus);
    const currentOrder = await this.findById(orderId);

    // Se já estiver no status desejado, operação idempotente
    if (currentOrder.status === status) {
      return currentOrder;
    }

    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [
        OrderStatus.ACCEPTED,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.REJECTED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
      [OrderStatus.READY_FOR_PICKUP]: [
        OrderStatus.PICKED_UP,
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REJECTED]: [],
    };

    const allowedNext = validTransitions[currentOrder.status as OrderStatus] || [];
    if (!allowedNext.includes(status)) {
      throw new BadRequestException(
        `Transição inválida: não é permitido mudar de ${currentOrder.status} para ${status}.`,
      );
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        statusHistory: {
          create: { status: status as any, note },
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    this.logger.log(`Pedido ${orderId} → ${status}`);
    return order;
  }

  /**
   * Atribui um entregador ao pedido.
   */
  async assignDriver(orderId: string, driverId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        driverId,
        status: OrderStatus.PICKED_UP,
        statusHistory: {
          create: {
            status: OrderStatus.PICKED_UP,
            note: `Entregador atribuído: ${driverId}`,
          },
        },
      },
    });
  }

  /**
   * Queries para o Dashboard Admin (GraphQL).
   * Retorna estatísticas agregadas.
   */
  async getDashboardStats() {
    const [totalOrders, activeOrders, totalRevenueResult] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.PENDING,
              OrderStatus.CONFIRMED,
              OrderStatus.PREPARING,
              OrderStatus.READY_FOR_PICKUP,
              OrderStatus.PICKED_UP,
              OrderStatus.IN_TRANSIT,
            ],
          },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: { status: OrderStatus.DELIVERED },
      }),
    ]);

    return {
      totalOrders,
      activeOrders,
      totalRevenue: totalRevenueResult._sum.totalPrice?.toNumber() || 0,
    };
  }

  /**
   * Estatísticas detalhadas para o dashboard do restaurante.
   *
   * CONCEITO: Agregações no Prisma
   * Usa count(), groupBy(), e aggregate(_sum) em paralelo para
   * calcular métricas financeiras e operacionais com eficiência.
   */
  async getRestaurantStats(restaurantId: string) {
    const [
      totalOrders,
      statusCounts,
      revenueResult,
      orderItems,
    ] = await Promise.all([
      // Total de pedidos deste restaurante
      this.prisma.order.count({ where: { restaurantId } }),

      // Contagem de pedidos agrupada por status
      this.prisma.order.groupBy({
        by: ['status'],
        where: { restaurantId },
        _count: { _all: true },
      }),

      // Faturamento total (apenas pedidos finalizados/entregues)
      this.prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: { restaurantId, status: OrderStatus.DELIVERED },
      }),

      // Itens vendidos para calcular os mais populares
      this.prisma.orderItem.findMany({
        where: { order: { restaurantId } },
        include: {
          menuItem: {
            select: { id: true, name: true, category: true, imageUrl: true },
          },
        },
      }),
    ]);

    // Mapear contagens por status
    const ordersByStatus: Record<string, number> = {};
    for (const group of statusCounts) {
      ordersByStatus[group.status] = group._count._all;
    }

    const completedOrders = ordersByStatus[OrderStatus.DELIVERED] || 0;
    const totalRevenue = revenueResult._sum.totalPrice?.toNumber() || 0;
    const averageTicket = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    // Calcular itens mais vendidos (agrupados por menuItemId)
    const itemMap = new Map<
      string,
      { id: string; name: string; category: string; quantity: number; revenue: number }
    >();

    for (const item of orderItems) {
      if (!item.menuItem) continue;
      const existing = itemMap.get(item.menuItemId) || {
        id: item.menuItem.id,
        name: item.menuItem.name,
        category: item.menuItem.category,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.unitPrice.toNumber() * item.quantity;
      itemMap.set(item.menuItemId, existing);
    }

    const topSellingItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const activeOrders =
      (ordersByStatus[OrderStatus.PENDING] || 0) +
      (ordersByStatus[OrderStatus.CONFIRMED] || 0) +
      (ordersByStatus[OrderStatus.PREPARING] || 0) +
      (ordersByStatus[OrderStatus.READY_FOR_PICKUP] || 0) +
      (ordersByStatus[OrderStatus.PICKED_UP] || 0) +
      (ordersByStatus[OrderStatus.IN_TRANSIT] || 0);

    return {
      totalOrders,
      completedOrders,
      activeOrders,
      cancelledOrders: ordersByStatus[OrderStatus.CANCELLED] || 0,
      totalRevenue,
      averageTicket: Number(averageTicket.toFixed(2)),
      ordersByStatus,
      topSellingItems,
    };
  }

  async clearAllOrders(restaurantId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const whereClause = restaurantId ? { restaurantId } : {};
      const orders = await tx.order.findMany({
        where: whereClause,
        select: { id: true },
      });

      const orderIds = orders.map((o) => o.id);

      if (orderIds.length > 0) {
        await tx.orderStatusHistory.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        await tx.order.deleteMany({
          where: { id: { in: orderIds } },
        });
      }

      this.logger.log(`Limpeza concluída: ${orderIds.length} pedidos removidos`);
      return { count: orderIds.length };
    });
  }
}

