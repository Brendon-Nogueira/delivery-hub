import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JwtStrategy — para validar JWTs.
 *
 * CONCEITO: Toda vez que um endpoint é protegido com @UseGuards(JwtAuthGuard),
 * o Passport intercepta a request, extrai o JWT do header Authorization,
 * valida a assinatura e decodifica o payload.
 * O resultado do validate() é injetado em req.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({

      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Rejeita tokens expirados automaticamente
      ignoreExpiration: false,
      // para validar a assinatura
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Chamado automaticamente após o JWT ser validado.
   * O retorno é atribuído a request.user.
   */
  async validate(payload: { sub: string; email: string; role: string }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
