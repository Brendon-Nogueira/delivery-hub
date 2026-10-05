import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@delivery-hub/shared';

/**
 * MenuController — CRUD REST.
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
   * Valida se o usuário é o dono do restaurante ou ADMIN.
   */
  @Get('restaurant/:restaurantId/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  async findAllByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: { userId: string; role: UserRole },
  ) {
    return this.menuService.findAllByRestaurant(restaurantId, user);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.menuService.findById(id);
  }

  @Post(':restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuItemDto,
    @CurrentUser() user: { userId: string; role: UserRole },
  ) {
    return this.menuService.create(restaurantId, dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: { userId: string; role: UserRole },
  ) {
    return this.menuService.update(id, dto, user);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  async toggleAvailability(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: UserRole },
  ) {
    return this.menuService.toggleAvailability(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: UserRole },
  ) {
    return this.menuService.delete(id, user);
  }
}
