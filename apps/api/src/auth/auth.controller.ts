import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
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
 * Nota: POST é usado para login porque estamos criando uma "sessão" (token),
 * não consultando dados (que seria GET).
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  // Status 201 é o padrão para POST no NEST
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
