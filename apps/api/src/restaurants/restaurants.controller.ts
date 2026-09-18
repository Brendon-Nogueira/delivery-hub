import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@delivery-hub/shared';

/**
 * RestaurantsController — CRUD REST para restaurantes.
 *
 * CONCEITOS REST:
 * - GET  /restaurants     → 200 OK + Array de restaurantes (coleção)
 * - GET  /restaurants/:id → 200 OK + Restaurante específico (recurso)
 * - POST /restaurants     → 201 Created + Novo restaurante
 *
 * Usa nomes no PLURAL para coleções (padrão REST).
 */
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) { }

  // Endpoint público 
  @Get()
  async findAll() {
    return this.restaurantsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  // Somente RESTAURANT_OWNER pode criar restaurante
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRestaurantDto,
  ) {
    return this.restaurantsService.create(userId, dto);
  }

  // Restaurante do owner logado
  @Get('my/restaurant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER)
  async getMyRestaurant(@CurrentUser('userId') userId: string) {
    return this.restaurantsService.findByOwnerId(userId);
  }
}
