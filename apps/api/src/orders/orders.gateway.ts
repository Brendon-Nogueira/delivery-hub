import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, WS_EVENTS } from '@delivery-hub/shared';
import { OrdersService } from './orders.service';

/**
 * OrdersGateway — WebSocket Gateway para pedidos em tempo real.
 *
 * CONCEITOS WEBSOCKET:
 * 
 * 1. NAMESPACE ('/orders'):
 *    Separa canais de comunicação. Pedidos usam /orders, GPS usa /delivery.
 *    Como ter "endpoints" diferentes no mundo WebSocket.
 * 
 * 2. ROOMS:
 *    Sub-canais dentro de um namespace. Ex: room "order:abc123" contém
 *    apenas o cliente, restaurante e entregador daquele pedido específico.
 *    Quando você emite para uma room, só quem está nela recebe.
 * 
 * 3. BIDIRECIONAL:
 *    Diferente do REST (cliente → servidor → resposta), aqui AMBOS
 *    podem enviar mensagens a qualquer momento sem request prévio.
 * 
 * 4. PERSISTÊNCIA DE CONEXÃO:
 *    A conexão fica aberta (TCP keep-alive). Não precisa de handshake
 *    HTTP a cada mensagem → latência muito menor que polling.
 * 
 * COMPARAÇÃO COM POLLING:
 *    - Polling: Cliente faz GET /orders/123 a cada 5s → 12 requests/min
 *    - WebSocket: Servidor PUSH quando há mudança → 0 requests desnecessários
 *    - Se nada muda em 1 hora, polling fez 720 requests à toa; WS fez 0.
 */
@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class OrdersGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly ordersService: OrdersService,
  ) { }

  /**
   * handleConnection — Chamado quando um cliente conecta ao namespace /orders.
   * 
   * Aqui validamos o JWT enviado no handshake e colocamos o cliente
   * em sua room pessoal (user:userId) para receber notificações direcionadas.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization?.replace('Bearer ', '')) ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.log(`Conectado em /orders (cliente web/visitante): ${client.id}`);
        return;
      }

      const payload = this.jwtService.verify(token);

      // Armazena dados do usuário 
      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      // Entra na room pessoal do usuário
      client.join(`user:${payload.sub}`);

      // Entra em room específica por papel se for entregador
      if (payload.role === 'DRIVER') {
        client.join('role:DRIVER');
      }

      this.logger.log(
        `Conectado: ${client.id} | ${payload.email} (${payload.role})`,
      );
    } catch (error: any) {
      this.logger.warn(`Auth falhou /orders: ${client.id} — ${error.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Desconectado: ${client.id}`);
  }

  /**
   * joinOrderRoom — Cliente entra na room de um pedido específico.
   * 
   * CONCEITO: Rooms são como "salas de chat" do Socket.io.
   * Quando o restaurante atualiza o status, o server emite
   * para a room "order:abc123" e APENAS quem está nela recebe.
   */
  @SubscribeMessage(WS_EVENTS.ORDER_JOIN_ROOM)
  handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    client.join(`order:${data.orderId}`);
    this.logger.log(
      `${client.data.user?.email || client.id} entrou na room order:${data.orderId}`,
    );

    return {
      event: 'joinedOrderRoom',
      data: { orderId: data.orderId, success: true },
    };
  }

  /**
   * joinRestaurantRoom — Restaurante entra na room para receber novos pedidos.
   */
  @SubscribeMessage(WS_EVENTS.RESTAURANT_JOIN_ROOM)
  handleJoinRestaurantRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string },
  ) {
    client.join(`restaurant:${data.restaurantId}`);
    this.logger.log(
      `Restaurante ${data.restaurantId} online (${client.data.user?.email || client.id})`,
    );

    return {
      event: 'joinedRestaurantRoom',
      data: { restaurantId: data.restaurantId, success: true },
    };
  }

  /**
   * updateOrderStatus — Restaurante/Entregador atualiza status via WebSocket.
   * Validação de usuário autenticado e emissão direcionada para rooms.
   */
  @SubscribeMessage(WS_EVENTS.ORDER_UPDATE_STATUS)
  async handleUpdateOrderStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { orderId: string; status: OrderStatus | string; note?: string },
  ) {
    try {
      const user = client.data?.user;
      if (!user) {
        return {
          event: 'statusUpdateError',
          data: { success: false, message: 'Autenticação necessária para atualizar status.' },
        };
      }

      // Atualiza com validação de permissões!
      const updatedOrder = await this.ordersService.updateStatusWithAuth(
        data.orderId,
        data.status as any,
        user,
        data.note,
      );

      const statusPayload = {
        orderId: data.orderId,
        status: updatedOrder.status,
        note: data.note,
        updatedBy: user.email,
        updatedAt: new Date().toISOString(),
      };

      // Transmite via WebSocket EXCLUSIVAMENTE para as rooms autorizadas
      this.server.to(`order:${data.orderId}`).emit(WS_EVENTS.ORDER_STATUS_CHANGED, statusPayload);
      this.server.to(`restaurant:${updatedOrder.restaurantId}`).emit(WS_EVENTS.ORDER_STATUS_CHANGED, statusPayload);
      this.server.to(`user:${updatedOrder.customerId}`).emit(WS_EVENTS.ORDER_STATUS_CHANGED, statusPayload);

      if (updatedOrder.status === OrderStatus.READY_FOR_PICKUP) {
        this.server.to('role:DRIVER').emit(WS_EVENTS.ORDER_STATUS_CHANGED, statusPayload);
      }

      this.logger.log(
        `Status atualizado e emitido para rooms: ${data.orderId} → ${updatedOrder.status} (por ${user.email})`,
      );

      return { event: 'statusUpdated', data: { success: true, status: updatedOrder.status } };
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar status do pedido ${data.orderId}: ${error.message}`);
      return { event: 'statusUpdateError', data: { success: false, message: error.message } };
    }
  }

  // ─── Métodos chamados pelo OrdersController (REST → WS bridge) ───

  /**
   * Emite evento de novo pedido para a room do restaurante e para o cliente criador.
   * Não faz broadcast global para evitar vazamento de dados de clientes.
   */
  emitNewOrder(restaurantId: string, order: any) {
    this.server.to(`restaurant:${restaurantId}`).emit(WS_EVENTS.ORDER_NEW, order);
    if (order?.customerId) {
      this.server.to(`user:${order.customerId}`).emit(WS_EVENTS.ORDER_NEW, order);
    }
    this.logger.log(`Novo pedido emitido para restaurant:${restaurantId} e user:${order?.customerId}`);
  }

  /**
   * Emite mudança de status direcionada para as rooms do pedido, restaurante e cliente.
   */
  emitOrderStatusChanged(
    orderId: string,
    status: OrderStatus,
    note?: string,
    restaurantId?: string,
    customerId?: string,
  ) {
    const payload = {
      orderId,
      status,
      note,
      updatedAt: new Date().toISOString(),
    };

    this.server.to(`order:${orderId}`).emit(WS_EVENTS.ORDER_STATUS_CHANGED, payload);

    if (restaurantId) {
      this.server.to(`restaurant:${restaurantId}`).emit(WS_EVENTS.ORDER_STATUS_CHANGED, payload);
    }

    if (customerId) {
      this.server.to(`user:${customerId}`).emit(WS_EVENTS.ORDER_STATUS_CHANGED, payload);
    }

    if (status === OrderStatus.READY_FOR_PICKUP) {
      this.server.to('role:DRIVER').emit(WS_EVENTS.ORDER_STATUS_CHANGED, payload);
    }
  }
}
