import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * AuthController — Endpoints REST para autenticação.
 *
 * CONCEITOS REST:
 * - POST /api/v1/auth/register → Cria recurso (usuário) → 201 Created
 * - POST /api/v1/auth/login    → Ação (autenticar)     → 200 OK
 *
 * Proteção estrita contra força bruta (10 req/min).
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
