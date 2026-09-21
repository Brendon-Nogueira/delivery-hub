import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MVP data...');

  // cliente
  const passwordHash = await bcrypt.hash('123456', 10);

  const customer = await prisma.user.upsert({
    where: { email: 'cliente@teste.com' },
    update: {},
    create: {
      id: 'user-123',
      email: 'cliente@teste.com',
      name: 'Cliente Teste',
      passwordHash,
      role: UserRole.CUSTOMER,
      phone: '35999999999',
    },
  });

  // owner
  const owner = await prisma.user.upsert({
    where: { email: 'dono@restaurante.com' },
    update: {},
    create: {
      id: 'owner-123',
      email: 'dono@restaurante.com',
      name: 'Dono Restaurante',
      passwordHash,
      role: UserRole.RESTAURANT_OWNER,
    },
  });

  // entregadpr
  const driver = await prisma.user.upsert({
    where: { email: 'driver@teste.com' },
    update: {},
    create: {
      id: 'driver-123',
      email: 'driver@teste.com',
      name: 'Entregador Carlos',
      passwordHash,
      role: UserRole.DRIVER,
      phone: '35988888888',
    },
  });

  // Restaurante Paraisópolis
  const restaurant = await prisma.restaurant.upsert({
    where: { ownerId: owner.id },
    update: {},
    create: {
      id: 'rest-123',
      name: 'Restaurante Paraisópolis',
      description: 'Pratos Feitos • Lanches • Bebidas',
      address: 'Praça Cel. José Vieira, Centro, Paraisópolis - MG',
      latitude: -22.553800,
      longitude: -45.779600,
      ownerId: owner.id,
    },
  });

  // cria o item do menu
  const menuItem = await prisma.menuItem.upsert({
    where: { id: 'item-1' },
    update: {},
    create: {
      id: 'item-1',
      name: 'Prato Feito Especial',
      description: 'Arroz, feijão, bife acebolado e fritas',
      price: 25.90,
      category: 'Pratos Feitos',
      restaurantId: restaurant.id,
    },
  });

  console.log('Seeding finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
