import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@delivery-hub/shared';

/**
 * MenuController — CRUD REST.
 *
 * CONCEITOS REST:
 * - GET    /menu/restaurant/:restaurantId       → Listar itens disponíveis (public)
 * - GET    /menu/restaurant/:restaurantId/all   → Listar TODOS os itens (owner)
 * - GET    /menu/:id                            → Detalhe de um item
 * - POST   /menu/:restaurantId                  → Criar item (owner)
 * - PATCH  /menu/:id                            → Atualizar parcialmente (owner)
 * - PATCH  /menu/:id/toggle                     → Toggle disponibilidade (owner)
 * - DELETE /menu/:id                            → Deletar item (owner)
 *
 * CONCEITO: Guards em cascata
 * @UseGuards(JwtAuthGuard, RolesGuard) aplica dois guards em sequência:
 * 1. JwtAuthGuard: verifica se o token JWT é válido
 * 2. RolesGuard: verifica se o role do usuário é permitido
 * Se qualquer guard falhar, retorna 401/403 automaticamente.
 */
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) { }

  /**
   * Endpoint public
   */
  @Get('restaurant/:restaurantId')
  async findByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findByRestaurant(restaurantId);
  }

  /**
   * Endpoint private
   * Usado por MenuManagementView do owner.
   *
   * CONCEITO: Rota específica ANTES de rota genérica
   * O NestJS avalia rotas em ordem de declaração.
   * 'restaurant/:restaurantId/all' precisa vir ANTES de ':id'
   * para não ser interpretado como um ID.
   */
  @Get('restaurant/:restaurantId/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  async findAllByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findAllByRestaurant(restaurantId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.menuService.findById(id);
  }

  @Post(':restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuService.create(restaurantId, dto);
  }

  /**
   * PATCH
   * Aceita qualquer combinação de campos (nome, preço, descrição...)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.update(id, dto);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  async toggleAvailability(@Param('id') id: string) {
    return this.menuService.toggleAvailability(id);
  }

  /**
   * DELETE
   * Se o item tem pedidos associados, faz soft-delete (desativa).
   * Se não tem, faz hard-delete (remove do banco).
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  async delete(@Param('id') id: string) {
    return this.menuService.delete(id);
  }
}
