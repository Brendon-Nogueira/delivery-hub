import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UserRole } from '@delivery-hub/shared';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Helper para validar propriedade do restaurante.
   */
  async verifyRestaurantOwnership(
    restaurantId: string,
    user: { userId: string; role: UserRole },
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurante ${restaurantId} não encontrado`);
    }

    if (restaurant.ownerId !== user.userId) {
      throw new ForbiddenException('Você não tem permissão para gerenciar o cardápio deste restaurante.');
    }
  }

  /**
   * Helper para validar se o item pertence a um restaurante do usuário.
   */
  async verifyMenuItemOwnership(
    menuItemId: string,
    user: { userId: string; role: UserRole },
  ) {
    const item = await this.findById(menuItemId);
    await this.verifyRestaurantOwnership(item.restaurantId, user);
    return item;
  }

  /**
   * CREATE.
   */
  async create(
    restaurantId: string,
    dto: CreateMenuItemDto,
    user: { userId: string; role: UserRole },
  ) {
    await this.verifyRestaurantOwnership(restaurantId, user);

    return this.prisma.menuItem.create({
      data: {
        ...dto,
        restaurantId,
      },
    });
  }

  /**
   * SEARCH (Público - cliente vê itens disponíveis).
   */
  async findByRestaurant(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true },
      orderBy: { category: 'asc' },
    });
  }

  /**
   * SEARCH (Privado - dono do restaurante).
   */
  async findAllByRestaurant(
    restaurantId: string,
    user: { userId: string; role: UserRole },
  ) {
    await this.verifyRestaurantOwnership(restaurantId, user);

    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Item ${id} não encontrado`);
    return item;
  }

  /**
   * Atualiza parcialmente um item do cardápio com validação de propriedade.
   */
  async update(
    id: string,
    dto: UpdateMenuItemDto,
    user: { userId: string; role: UserRole },
  ) {
    await this.verifyMenuItemOwnership(id, user);

    return this.prisma.menuItem.update({
      where: { id },
      data: { ...dto },
    });
  }

  /**
   * Alterna a disponibilidade de um item com validação de propriedade.
   */
  async toggleAvailability(
    id: string,
    user: { userId: string; role: UserRole },
  ) {
    const item = await this.verifyMenuItemOwnership(id, user);

    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }

  /**
   * DELETE com validação de propriedade.
   */
  async delete(
    id: string,
    user: { userId: string; role: UserRole },
  ) {
    await this.verifyMenuItemOwnership(id, user);

    const orderItemsCount = await this.prisma.orderItem.count({
      where: { menuItemId: id },
    });

    if (orderItemsCount > 0) {
      return this.prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
      });
    }

    return this.prisma.menuItem.delete({ where: { id } });
  }
}
