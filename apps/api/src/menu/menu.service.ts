import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * CREATE.
   *
   * CONCEITO Prisma: create()
   * Insere um novo registro. O spread operator (...dto) mapeia
   * automaticamente os campos do DTO para as colunas do banco.
   */
  async create(restaurantId: string, dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: {
        ...dto,
        restaurantId,
      },
    });
  }

  /**
   * SEARCH.
   *
   * CONCEITO: Filtragem por disponibilidade
   * O cliente NÃO deve ver itens marcados como "esgotado".
   * O owner vê todos via findAllByRestaurant().
   */
  async findByRestaurant(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true },
      orderBy: { category: 'asc' },
    });
  }

  /**
   * SEARCH.
   *
   * CONCEITO: Endpoint de gestão vs. endpoint público
   * O owner do restaurante precisa ver TODOS os itens para gerenciá-los,
   * inclusive os que estão temporariamente indisponíveis.
   * Este endpoint é protegido por JwtAuthGuard + RolesGuard no controller.
   */
  async findAllByRestaurant(restaurantId: string) {
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
   * Atualiza parcialmente um item do cardápio.
   *
   * CONCEITO Prisma: update() com spread
   * O Prisma ignora campos undefined, então podemos fazer spread
   * do DTO diretamente — só os campos enviados serão atualizados.
   * Isso é o comportamento PATCH ideal.
   */
  async update(id: string, dto: UpdateMenuItemDto) {

    await this.findById(id);

    return this.prisma.menuItem.update({
      where: { id },
      data: { ...dto },
    });
  }

  /**
   * Alterna a disponibilidade de um item.
   *
   * CONCEITO: Toggle pattern
   * Busca o estado atual e inverte. Útil para marcar itens como
   * "esgotado" sem deletá-los permanentemente.
   */
  async toggleAvailability(id: string) {
    const item = await this.findById(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }

  /**
   * DELETE.
   *
   * CONCEITO: Hard delete vs. Soft delete
   * Aqui usamos hard delete (remoção real do banco).
   * Em produção, seria melhor usar soft delete (marcar como deletado)
   * para manter histórico de pedidos que referenciavam este item.
   *
   */
  async delete(id: string) {
    await this.findById(id);


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
