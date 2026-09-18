import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — Guard para proteger endpoints REST.
 *
 * Uso: @UseGuards(JwtAuthGuard) em controllers ou rotas específicas.
 * Quando ativo, o endpoint retorna 401 se o JWT for inválido ou ausente.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
