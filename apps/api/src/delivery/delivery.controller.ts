import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { DeliveryService, DriverLocation } from './delivery.service';
import { DeliveryGateway } from './delivery.gateway';
import { UpdateLocationDto } from './dto/update-location.dto';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('delivery')
export class DeliveryController {
  private readonly logger = new Logger(DeliveryController.name);

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly deliveryGateway: DeliveryGateway,
    private readonly prisma: PrismaService,
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
   * Endpoint simulador: Dispara uma rota de entrega em ruas reais (OSRM).
   * Emite cada coordenada curva a curva e notifica chegada ao destino.
   */
  @Post('simulate-trip/:orderId')
  async simulateTrip(
    @Param('orderId') orderId: string,
    @Body()
    body?: {
      startLat?: number;
      startLng?: number;
      endLat?: number;
      endLng?: number;
      waypoints?: [number, number][];
      steps?: number;
    },
  ) {
    let startLat = body?.startLat ?? -22.5538;
    let startLng = body?.startLng ?? -45.7796;
    let endLat = body?.endLat ?? -22.54384;
    let endLng = body?.endLng ?? -45.76853;
    let destinationLabel = 'Endereço de Entrega';

    // 1. Busca dados do pedido no PostgreSQL para obter coordenadas reais do Restaurante e Cliente
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { restaurant: true },
      });

      if (order) {
        if (order.restaurant?.latitude && order.restaurant?.longitude) {
          startLat = order.restaurant.latitude;
          startLng = order.restaurant.longitude;
        }

        if (order.notes) {
          const gpsMatch = order.notes.match(/GPS:\s*([-\d.]+)\s*,\s*([-\d.]+)/);
          if (gpsMatch) {
            endLat = parseFloat(gpsMatch[1]);
            endLng = parseFloat(gpsMatch[2]);
          } else if (order.notes.toLowerCase().includes('sabará') || order.notes.toLowerCase().includes('sabara')) {
            endLat = -22.54384;
            endLng = -45.76853;
          }

          const addrMatch = order.notes.match(/\[Entrega:\s*(.*?)(\s*\|\s*GPS:[^\]]*)?\]/);
          if (addrMatch && addrMatch[1]) {
            destinationLabel = addrMatch[1].trim();
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Erro ao consultar pedido ${orderId} no banco: ${err.message}`);
    }

    let routeCoords: [number, number][] = body?.waypoints || [];
    let streetNames: string[] = [];

    // 2. Se waypoints não foram enviados pelo frontend, consulta OSRM diretamente
    if (!routeCoords || routeCoords.length === 0) {
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(osrmUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            routeCoords = data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]],
            );

            // Extrai nomes das vias do OSRM
            const steps = data.routes[0].legs?.[0]?.steps || [];
            streetNames = steps.map((s: any) => s.name).filter(Boolean);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Fallback OSRM no backend para pedido ${orderId}: ${err.message}`);
      }
    }

    // 3. Fallback se OSRM estiver temporariamente indisponível
    if (!routeCoords || routeCoords.length === 0) {
      const steps = body?.steps ?? 30;
      routeCoords = [];
      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        const jitterLat = Math.sin(ratio * Math.PI * 3) * 0.0003;
        const jitterLng = Math.cos(ratio * Math.PI * 2) * 0.0002;
        routeCoords.push([
          Number((startLat + (endLat - startLat) * ratio + jitterLat).toFixed(6)),
          Number((startLng + (endLng - startLng) * ratio + jitterLng).toFixed(6)),
        ]);
      }
    }

    this.logger.log(
      `Iniciando simulação de rota viária REAL para pedido ${orderId} (${routeCoords.length} waypoints pelas ruas até "${destinationLabel}")...`,
    );

    // Inicia simulação em background com telemetria passo a passo
    (async () => {
      // Duração total ~25 segundos distribuída entre os waypoints
      const intervalMs = Math.max(400, Math.min(1200, Math.round(25000 / routeCoords.length)));

      for (let i = 0; i < routeCoords.length; i++) {
        const [currentLat, currentLng] = routeCoords[i];
        const stepIndex = i + 1;
        const totalSteps = routeCoords.length;
        const progressPercent = Math.round((stepIndex / totalSteps) * 100);
        const isArrived = i === routeCoords.length - 1;

        // Determina nome aproximado da via atual
        const streetIdx = Math.min(
          streetNames.length - 1,
          Math.floor((i / routeCoords.length) * (streetNames.length || 1)),
        );
        const streetName = streetNames[streetIdx] || (isArrived ? destinationLabel : 'Vias de Paraisópolis');

        const location: DriverLocation = {
          orderId,
          lat: currentLat,
          lng: currentLng,
          stepIndex,
          totalSteps,
          progressPercent,
          isArrived,
          streetName,
          timestamp: new Date().toISOString(),
        };

        await this.deliveryService.saveDriverLocation(location);
        this.deliveryGateway.emitLocationUpdate(location);

        if (stepIndex % 5 === 0 || isArrived) {
          this.logger.log(
            `[Passo ${stepIndex}/${totalSteps} • ${progressPercent}%] GPS: (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}) → ${streetName}`,
          );
        }

        if (!isArrived) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }

      // 4. Notifica chegada ao destino para cliente e entregador
      this.deliveryGateway.emitDriverArrived(orderId);
      this.logger.log(`[DeliveryController] Chegada confirmada! Entregador no portão de "${destinationLabel}" para o pedido ${orderId}.`);
    })();

    return {
      message: `Simulação de rota real iniciada para o pedido ${orderId}`,
      totalWaypoints: routeCoords.length,
      estimatedSeconds: 25,
      destination: destinationLabel,
    };
  }
}
