import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { join } from 'path';

import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryModule } from './delivery/delivery.module';

interface ContextArgs { req: Request; }

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // ─── Configuração Global ──────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'], // Suporta .env na raiz do monorepo
    }),

    // ─── Rate Limiting Global (Throttler) ──────────────────
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 segundos
        limit: 120, // 120 requisições por IP por minuto
      },
    ]),

    // ─── GraphQL (Code-First) ─────────────────────────────────────
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: !isProduction,
      introspection: !isProduction,
      context: ({ req }: ContextArgs) => ({ req }),
    }),

    // ─── Infraestrutura ───────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ─── Módulos de Domínio ───────────────────────────────────────
    AuthModule,
    UsersModule,
    RestaurantsModule,
    MenuModule,
    OrdersModule,
    DeliveryModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
