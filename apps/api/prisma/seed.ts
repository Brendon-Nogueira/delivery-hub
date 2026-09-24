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

  // Criação dos itens do cardápio diversificado (Fase 2)
  const menuItemsData = [
    // Pratos Feitos
    {
      id: 'item-1',
      name: 'Prato Feito Especial',
      description: 'Arroz, feijão carioquinha, bife acebolado suculento, batata frita e salada da horta.',
      price: 25.90,
      category: 'Pratos Feitos',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'item-2',
      name: 'Filé de Frango Grelhado',
      description: 'Peito de frango grelhado marinado com ervas finas, arroz integral, feijão e legumes salteados.',
      price: 23.50,
      category: 'Pratos Feitos',
      imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'item-3',
      name: 'Picanha na Chapa Executiva',
      description: 'Cortes nobres de picanha na chapa, arroz biro-biro, mandioca cremosa na manteiga e farofa de bacon.',
      price: 39.90,
      category: 'Pratos Feitos',
      imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
    },
    // Lanches & Porções
    {
      id: 'item-4',
      name: 'Smash Burger Mantiqueira',
      description: 'Dois burgers artesanais 90g, cheddar derretido, cebola caramelizada e maionese defumada no pão brioche.',
      price: 28.00,
      category: 'Lanches',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'item-5',
      name: 'X-Tudo Paraisópolis',
      description: 'Hambúrguer 150g, queijo prato, presunto, bacon em fatias, ovo caipira, alface, tomate e milho verde.',
      price: 24.00,
      category: 'Lanches',
      imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'item-6',
      name: 'Porção Batata Rústica com Alecrim',
      description: '500g de batatas rústicas douradas temperadas com alecrim fresco, flor de sal e alho confit.',
      price: 22.00,
      category: 'Lanches',
      imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    },
    // Bebidas
    {
      id: 'item-7',
      name: 'Suco Natural de Laranja 500ml',
      description: 'Suco natural da fruta espremido na hora, rico em vitamina C, bem gelado.',
      price: 9.00,
      category: 'Bebidas',
      imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'item-8',
      name: 'Coca-Cola Original 350ml',
      description: 'Refrigerante lata 350ml bem gelado.',
      price: 6.00,
      category: 'Bebidas',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'item-9',
      name: 'Cerveja Artesanal da Serra 600ml',
      description: 'Cerveja Pilsen puro malte artesanal da Serra da Mantiqueira.',
      price: 14.50,
      category: 'Bebidas',
      imageUrl: 'https://images.unsplash.com/photo-1608270110325-1e479c7cbcd4?auto=format&fit=crop&w=600&q=80',
    },
    // Sobremesas
    {
      id: 'item-10',
      name: 'Pudim de Leite Moça',
      description: 'Fatia artesanal de pudim super cremoso sem furinhos, com calda de caramelo brilhante.',
      price: 10.00,
      category: 'Sobremesas',
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=60',
    },
    {
      id: 'item-11',
      name: 'Queijo Minas com Doce de Leite',
      description: 'Autêntico queijo minas padrão acompanhado de doce de leite cremoso artesanal.',
      price: 12.00,
      category: 'Sobremesas',
      imageUrl: 'https://images.unsplash.com/photo-1559553156-2e97137af16f?w=500&auto=format&fit=crop&q=60',
    },
  ];

  for (const item of menuItemsData) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl,
        restaurantId: restaurant.id,
        isAvailable: true,
      },
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl,
        restaurantId: restaurant.id,
        isAvailable: true,
      },
    });
  }

  console.log(`✅ Seeding finalizado com ${menuItemsData.length} itens no cardápio!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
