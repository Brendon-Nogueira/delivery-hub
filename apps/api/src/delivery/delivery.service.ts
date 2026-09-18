import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';

const DRIVER_LOCATION_KEY = (orderId: string) => `driver:location:${orderId}`;
const LOCATION_TTL_SECONDS = 30; // Posição expira em 30s se o entregador parar de enviar

export interface DriverLocation {
  orderId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

/**
 * DeliveryService — Lógica de negócio de entrega e rastreamento GPS.
 *
 * POR QUE REDIS PARA GPS?
 *
 * O entregador manda sua posição a cada 3 segundos enquanto está em rota.
 * Em um dia com 100 entregadores ativos, isso são ~2000 writes/min.
 *
 * PostgreSQL: cada write é um INSERT com leitura de índice, lock de tabela,
 *             flush em disco → ~5ms por operação.
 *
 * Redis:      cada write é um SET em memória → ~0.1ms por operação.
 *             50x mais rápido e sem sobrecarregar o Postgres.
 *
 * Além disso, usamos TTL (expiração): se o entregador fechar o app,
 * a posição some automaticamente em 30s sem precisar de cleanup manual.
 */
@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(private readonly redis: RedisService) { }

  /**
   * Salva a localização do entregador no Redis com TTL de 30 segundos.
   * Cada nova posição sobrescreve a anterior (não acumula histórico no Redis).
   */
  async saveDriverLocation(location: DriverLocation): Promise<void> {
    const key = DRIVER_LOCATION_KEY(location.orderId);
    await this.redis.set(key, location, LOCATION_TTL_SECONDS);
    this.logger.debug(
      `GPS salvo: pedido ${location.orderId} → (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`,
    );
  }

  /**
   * Busca a última posição conhecida do entregador para um pedido.
   * Retorna null se não houver posição recente (TTL expirou).
   */
  async getDriverLocation(orderId: string): Promise<DriverLocation | null> {
    return this.redis.get<DriverLocation>(DRIVER_LOCATION_KEY(orderId));
  }
}
