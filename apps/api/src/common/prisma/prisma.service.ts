import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — Wrapper do PrismaClient como serviço injetável do NestJS.
 *
 * CONCEITO: Em vez de instanciar o PrismaClient em cada serviço,
 * criamos uma instância única (singleton) gerenciada pelo container de DI do NestJS.
 * Isso garante pool de conexões eficiente e shutdown graceful.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conectado ao PostgreSQL via Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Desconectado do PostgreSQL');
  }
}
