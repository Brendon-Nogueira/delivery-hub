import { Resolver, Query, Args, ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@delivery-hub/shared';

/**
 * CONCEITO GRAPHQL — Code-First:
 *
 * Em vez de definir o schema em um arquivo .graphql (Schema-First),
 * usamos decorators TypeScript para definir os tipos.
 * O NestJS gera o schema automaticamente.
 *
 * Exemplo do schema gerado:
 *
 *   type OrderGql {
 *     id: ID!
 *     status: String!
 *     totalPrice: Float!
 *     customerName: String
 *     restaurantName: String
 *     driverName: String
 *     createdAt: DateTime!
 *   }
 *
 * VANTAGEM GRAPHQL PARA O ADMIN:
 * O dashboard precisa de dados de MÚLTIPLAS entidades (pedidos, usuários,
 * restaurantes, entregadores) em uma ÚNICA requisição.
 *
 * REST: O admin precisaria fazer 4 chamadas:
 *   GET /orders?status=ACTIVE
 *   GET /users?role=DRIVER
 *   GET /restaurants
 *   GET /stats/revenue
 *
 * GraphQL: UMA única query retorna tudo:
 *   query {
 *     dashboardStats { totalOrders, activeOrders, totalRevenue }
 *     orders(status: "PENDING", limit: 10) { id, customerName, restaurantName }
 *   }
 *
 * → Isso é a solução para o problema de UNDER-FETCHING do REST.
 */

@ObjectType('OrderGql')
export class OrderType {
  @Field(() => ID)
  id: string;

  @Field()
  status: string;

  @Field(() => Float)
  totalPrice: number;

  @Field({ nullable: true })
  notes?: string;

  @Field({ nullable: true })
  customerName?: string;

  @Field({ nullable: true })
  restaurantName?: string;

  @Field({ nullable: true })
  driverName?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class DashboardStats {
  @Field(() => Int)
  totalOrders: number;

  @Field(() => Int)
  activeOrders: number;

  @Field(() => Float)
  totalRevenue: number;
}

@Resolver(() => OrderType)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) { }

  /**
   * Query: orders — Lista pedidos com filtros opcionais.
   *
   * Exemplo de uso no GraphQL Playground:
   *
   *   query {
   *     orders(status: "PENDING", limit: 5) {
   *       id
   *       status
   *       totalPrice
   *       customerName
   *     }
   *   }
   *
   * O cliente escolhe EXATAMENTE quais campos receber.
   * Se não precisa de customerName, não inclui → menos dados transferidos.
   */
  @Query(() => [OrderType], {
    name: 'orders',
    description: 'Lista pedidos com filtros. Ideal para dashboard admin.',
  })
  async getOrders(
    @Args('status', { nullable: true }) status?: string,
    @Args('restaurantId', { nullable: true }) restaurantId?: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit?: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset?: number,
  ) {
    // Falta implementar query com filtros usando Prisma
    if (restaurantId) {
      const orders = await this.ordersService.findByRestaurant(
        restaurantId,
        status as OrderStatus | undefined,
      );
      return orders.map((o) => ({
        ...o,
        totalPrice: Number(o.totalPrice),
        customerName: o.customer?.name,
      }));
    }
    return [];
  }

  /**
   * Query: dashboardStats — Estatísticas agregadas para o painel admin.
   *
   * Exemplo:
   *   query {
   *     dashboardStats {
   *       totalOrders
   *       activeOrders
   *       totalRevenue
   *     }
   *   }
   */
  @Query(() => DashboardStats, {
    name: 'dashboardStats',
    description: 'Estatísticas do dashboard admin',
  })
  async getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }
}
