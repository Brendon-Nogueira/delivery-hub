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
   * Atualiza o status de um pedido.
   * Registra o histórico de mudança de status para auditoria.
   */
  async updateStatus(orderId: string, status: OrderStatus, note?: string) {

    const currentOrder = await this.findById(orderId);


    const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CONFIRMED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
      [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
      [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
      [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
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
}
