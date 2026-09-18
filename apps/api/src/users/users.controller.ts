import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * UsersController — Endpoints REST para usuários.
 *
 * CONCEITOS REST:
 * - GET /api/v1/users         → Listar todos (coleção)
 * - GET /api/v1/users/me      → Perfil do usuário logado
 * - GET /api/v1/users/:id     → Detalhes de um usuário específico
 *
 * Nota: GET nunca altera estado no servidor — é idempotente e "safe".
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  async getProfile(@CurrentUser() user: { userId: string }) {
    return this.usersService.findById(user.userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
