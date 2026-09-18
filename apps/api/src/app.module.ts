import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
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

@Module({
  imports: [
    // ─── Configuração Global ──────────────────────────────────────
    // Carrega .env automaticamente e torna ConfigService disponível em qualquer módulo
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'], // Suporta .env na raiz do monorepo
    }),

    // ─── GraphQL (Code-First) ─────────────────────────────────────
    // O schema é gerado automaticamente a partir dos decorators @ObjectType, @Field, etc.
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'), // Gera arquivo de schema
      sortSchema: true,
      playground: true, // Habilita GraphQL Playground em http://localhost:4000/graphql
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
})
export class AppModule { }
