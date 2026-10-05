import { Controller, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@delivery-hub/shared';

/**
 * UsersController — Endpoints REST para usuários.
 *.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  /**
   * Apenas ADMIN pode listar todos os usuários da plataforma.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  async getProfile(@CurrentUser() user: { userId: string }) {
    return this.usersService.findById(user.userId);
  }

  /**
   * Usuários só podem consultar seu próprio cadastro (ADMIN).
   */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: UserRole },
  ) {
    if (user.role !== UserRole.ADMIN && user.userId !== id) {
      throw new ForbiddenException('Acesso negado aos dados de outro usuário.');
    }
    return this.usersService.findById(id);
  }
}
