import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * RedisService — Wrapper sobre o ioredis para uso no NestJS.
 *
 * CONCEITO REDIS:
 *
 * Redis é um banco de dados in-memory (tudo na RAM), ideal para dados temporários
 * que precisam de acesso ultrarrápido. Diferente do PostgreSQL que persiste em disco,
 * o Redis perde os dados quando é reiniciado (mas nesse projeto isso é aceitável
 * para localização GPS — se o servidor reiniciar, o entregador manda nova posição
 * em 3 segundos automaticamente).
 *
 * TIPOS DE DADOS USADOS AQUI:
 *
 * SET key value EX 30  → Salva um valor com expiração automática em 30 segundos
 * GET key              → Busca o valor (retorna null se expirou)
 *
 * Isso é PERFEITO para GPS: se o entregador parar de mandar posição (saiu da app,
 * ficou sem internet), o dado some automaticamente em 30s em vez de acumular lixo.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly config: ConfigService) { }

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });
    } else {
      this.client = new Redis({
        host: this.config.get('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get('REDIS_PASSWORD', undefined),
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });
    }

    this.client.on('connect', () => this.logger.log('Conectado ao Redis'));
    this.client.on('error', (err) => this.logger.error(`Erro Redis: ${err.message}`));
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
