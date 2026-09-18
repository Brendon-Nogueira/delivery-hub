import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateRestaurantDto) {
    return this.prisma.restaurant.create({
      data: {
        ...dto,
        ownerId,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.restaurant.findMany({
      where: { isActive: true },
      include: {
        owner: {
          select: { id: true, name: true },
        },
        _count: {
          select: { menuItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        menuItems: {
          where: { isAvailable: true },
          orderBy: { category: 'asc' },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurante ${id} não encontrado`);
    }

    return restaurant;
  }

  async findByOwnerId(ownerId: string) {
    return this.prisma.restaurant.findUnique({
      where: { ownerId },
      include: {
        menuItems: true,
        _count: {
          select: { orders: true },
        },
      },
    });
  }
}
