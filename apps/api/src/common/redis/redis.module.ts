import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * RedisModule — Módulo global para o Redis.
 *
 * O decorator @Global() faz com que o RedisService seja disponível
 * em QUALQUER módulo sem precisar importar o RedisModule em cada um.
 * Basta injetar RedisService no construtor.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
