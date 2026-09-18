import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * MenuController — CRUD REST para itens do cardápio.
 *
 * CONCEITOS REST:
 * - GET   /menu/restaurant/:restaurantId → Listar itens (sub-recurso)
 * - POST  /menu/:restaurantId            → Criar item
 * - PATCH /menu/:id/toggle               → Atualização parcial (toggle)
 *
 * PATCH vs PUT:
 * - PATCH: Atualiza parcialmente (ex: mudar só 1 campo)
 * - PUT: Substitui o recurso inteiro (precisa enviar tudo)
 */
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('restaurant/:restaurantId')
  async findByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.menuService.findByRestaurant(restaurantId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.menuService.findById(id);
  }

  @Post(':restaurantId')
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menuService.create(restaurantId, dto);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleAvailability(@Param('id') id: string) {
    return this.menuService.toggleAvailability(id);
  }
}
