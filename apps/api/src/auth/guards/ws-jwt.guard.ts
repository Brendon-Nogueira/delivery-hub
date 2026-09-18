import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WsJwtGuard — Guard para proteger WebSocket Gateways.
 *
 * CONCEITO: WebSockets não usam HTTP headers tradicionais,
 * então o JWT é enviado no handshake (auth.token) durante a conexão.
 * Este guard valida o token e anexa o user ao socket.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) { }

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();

    try {
      const token = client.handshake.auth?.token;

      if (!token) {
        throw new WsException('Token não fornecido');
      }

      const payload = this.jwtService.verify(token);

      // Anexar dados do usuário ao objeto de dados do socket
      // para que os handlers possam acessar via client.data.user
      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (error) {
      this.logger.warn(`WebSocket auth falhou: ${error.message}`);
      client.disconnect();
      return false;
    }
  }
}
