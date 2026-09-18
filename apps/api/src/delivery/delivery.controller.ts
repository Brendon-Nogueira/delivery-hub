import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { DeliveryService, DriverLocation } from './delivery.service';
import { DeliveryGateway } from './delivery.gateway';
import { UpdateLocationDto } from './dto/update-location.dto';

@Controller('delivery')
export class DeliveryController {
  private readonly logger = new Logger(DeliveryController.name);

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly deliveryGateway: DeliveryGateway,
  ) { }

  /**
   * Endpoint REST para receber coordenadas GPS do entregador.
   * Salva no Redis (chave driver:location:{orderId}) e faz broadcast via WebSocket.
   */
  @Post('location')
  async updateLocation(@Body() dto: UpdateLocationDto) {
    const location: DriverLocation = {
      orderId: dto.orderId,
      lat: dto.lat,
      lng: dto.lng,
      timestamp: new Date().toISOString(),
    };

    // 1. Salva no cache do Redis
    await this.deliveryService.saveDriverLocation(location);

    // 2. Transmite via WebSocket para o cliente conectado
    this.deliveryGateway.emitLocationUpdate(location);

    return { success: true, location };
  }

  /**
   * Retorna a última localização conhecida do entregador em cache no Redis.
   */
  @Get('location/:orderId')
  async getLocation(@Param('orderId') orderId: string) {
    const location = await this.deliveryService.getDriverLocation(orderId);
    return {
      orderId,
      location: location ?? null,
      cached: !!location,
    };
  }

  /**
   * Endpoint simulador: Dispara uma rota de entrega com waypoints em direção ao cliente.
   * Emite coordenadas a cada 1.5s atualizando Redis e o WebSocket.
   */
  @Post('simulate-trip/:orderId')
  async simulateTrip(
    @Param('orderId') orderId: string,
    @Body() body?: { startLat?: number; startLng?: number; endLat?: number; endLng?: number; steps?: number },
  ) {
    // Ponto inicial padrão: Paraisópolis - MG (Centro / Praça da Matriz)
    // Ponto final padrão: Paraisópolis - MG (Bairro Residencial)
    const startLat = body?.startLat ?? -22.553800;
    const startLng = body?.startLng ?? -45.779600;
    const endLat = body?.endLat ?? -22.559800;
    const endLng = body?.endLng ?? -45.773500;
    const steps = body?.steps ?? 15;

    this.logger.log(`🚗 Iniciando simulação de rota para pedido ${orderId} (${steps} passos)...`);

    // Inicia simulação em background
    (async () => {
      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        // Adiciona uma pequena variação para parecer trajeto em ruas reais
        const jitterLat = (Math.sin(ratio * Math.PI * 3) * 0.0005);
        const jitterLng = (Math.cos(ratio * Math.PI * 2) * 0.0004);

        const currentLat = startLat + (endLat - startLat) * ratio + jitterLat;
        const currentLng = startLng + (endLng - startLng) * ratio + jitterLng;

        const location: DriverLocation = {
          orderId,
          lat: Number(currentLat.toFixed(6)),
          lng: Number(currentLng.toFixed(6)),
          timestamp: new Date().toISOString(),
        };

        await this.deliveryService.saveDriverLocation(location);
        this.deliveryGateway.emitLocationUpdate(location);

        if (i < steps) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      this.logger.log(`Simulação de rota concluída para pedido ${orderId}!`);
    })();

    return {
      message: `Simulação iniciada para o pedido ${orderId}`,
      totalSteps: steps,
      intervalMs: 1500,
    };
  }
}
