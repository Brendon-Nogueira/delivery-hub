import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { DeliveryService, DriverLocation } from './delivery.service';

/**
 * DeliveryGateway — WebSocket Gateway para rastreamento GPS em tempo real.
 *
 * NAMESPACE '/delivery':
 * Separado do /orders para ter canais de comunicação distintos.
 * O entregador conecta em /delivery para mandar posição.
 * O cliente conecta em /delivery para receber atualizações no mapa.
 *
 * FLUXO COMPLETO:
 *
 * 1. Entregador conecta no namespace /delivery com seu JWT.
 * 2. Entregador emite 'sendLocation' a cada 3 segundos com { orderId, lat, lng }.
 * 3. O servidor:
 *    a. Salva a posição no Redis (com TTL de 30s).
 *    b. Faz broadcast do evento 'driverLocationUpdate' para a room do pedido.
 * 4. O cliente (que está na room 'order:xyz') recebe o evento e move o pin no mapa.
 *
 * LATÊNCIA COMPARADA AO POLLING:
 * - Polling (cliente pergunta a cada 3s): latência média 1.5s.
 * - WebSocket PUSH: latência ~50ms. O cliente vê o entregador 30x mais rápido!
 */
@WebSocketGateway({
  namespace: '/delivery',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DeliveryGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly deliveryService: DeliveryService,
  ) { }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization?.replace('Bearer ', '')) ||
        (client.handshake.query?.token as string);

      if (token) {
        const payload = this.jwtService.verify(token);
        client.data.user = { userId: payload.sub, email: payload.email, role: payload.role };
        this.logger.log(`Conectado em /delivery: ${payload.email} (${payload.role})`);
      } else {
        this.logger.log(`Conectado em /delivery (anônimo / cliente web): ${client.id}`);
      }
    } catch {
      this.logger.warn(`Conexão em /delivery sem token válido ou anônimo: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Desconectado de /delivery: ${client.data.user?.email ?? client.id}`);
  }

  /**
   * Dispara atualização de localização do entregador para todos na room do pedido.
   */
  emitLocationUpdate(location: DriverLocation) {
    if (this.server) {
      this.server.to(`order:${location.orderId}`).emit('driverLocationUpdate', location);
      // Também emite globalmente para fácil visualização em painéis de monitoramento
      this.server.emit('driverLocationUpdate', location);
    }
  }

  /**
   * joinDeliveryRoom — Cliente ou entregador entra na room de um pedido.
   *
   * O CLIENTE chama isso assim que abre a tela de rastreamento.
   * Assim, quando o entregador mandar posição, o cliente recebe automaticamente.
   */
  @SubscribeMessage('joinDeliveryRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    client.join(`order:${data.orderId}`);
    this.logger.log(`${client.data.user?.email} rastreando pedido ${data.orderId}`);
    return { event: 'joinedDeliveryRoom', data: { orderId: data.orderId, success: true } };
  }

  /**
   * sendLocation — Entregador envia sua posição GPS.
   *
   * Payload: { orderId: string, lat: number, lng: number }
   *
   * O servidor:
   * 1. Persiste no Redis (rápido, com TTL).
   * 2. Faz broadcast para todos na room do pedido (cliente no mapa).
   */
  @SubscribeMessage('sendLocation')
  async handleSendLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; lat: number; lng: number },
  ) {
    const location: DriverLocation = {
      orderId: data.orderId,
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    };

    // 1. Salva no Redis com TTL de 30 segundos
    await this.deliveryService.saveDriverLocation(location);

    // 2. Broadcast para todos os clientes na room do pedido
    this.server.to(`order:${data.orderId}`).emit('driverLocationUpdate', location);

    this.logger.debug(
      `Broadcast GPS: pedido ${data.orderId} → (${data.lat.toFixed(4)}, ${data.lng.toFixed(4)})`,
    );

    return { event: 'locationReceived', data: { success: true } };
  }

  /**
   * getLastLocation — Busca a última posição conhecida do Redis (REST-like via WS).
   * Útil para o cliente carregar a posição inicial ao abrir a tela de rastreamento.
   */
  @SubscribeMessage('getLastLocation')
  async handleGetLastLocation(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const location = await this.deliveryService.getDriverLocation(data.orderId);
    return { event: 'lastLocation', data: location };
  }
}
