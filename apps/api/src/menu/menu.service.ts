import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async create(restaurantId: string, dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: {
        ...dto,
        restaurantId,
      },
    });
  }

  async findByRestaurant(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true },
      orderBy: { category: 'asc' },
    });
  }

  async findById(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Item ${id} não encontrado`);
    return item;
  }

  async toggleAvailability(id: string) {
    const item = await this.findById(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }
}
