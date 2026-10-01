import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MVP data...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // cliente
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

  const ownerSmash = await prisma.user.upsert({
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

  const ownerPizza = await prisma.user.upsert({
    where: { email: 'dono@bella-pizza.com' },
    update: {},
    create: {
      id: 'owner-pizza',
      email: 'dono@bella-pizza.com',
      name: 'Dona Bella Pizza',
      passwordHash,
      role: UserRole.RESTAURANT_OWNER,
    },
  });

  const ownerAcai = await prisma.user.upsert({
    where: { email: 'dono@acai-serra.com' },
    update: {},
    create: {
      id: 'owner-acai',
      email: 'dono@acai-serra.com',
      name: 'Dono Açaí Serra',
      passwordHash,
      role: UserRole.RESTAURANT_OWNER,
    },
  });

  const ownerSushi = await prisma.user.upsert({
    where: { email: 'dono@sushi-hub.com' },
    update: {},
    create: {
      id: 'owner-sushi',
      email: 'dono@sushi-hub.com',
      name: 'Dono Sushi Hub',
      passwordHash,
      role: UserRole.RESTAURANT_OWNER,
    },
  });

  // ─── Restaurante 1: Paraíso Smash Burger ──────────────────────────────────
  const rest1 = await prisma.restaurant.upsert({
    where: { ownerId: ownerSmash.id },
    update: {
      name: 'Paraíso Smash Burger',
      description: 'Hambúrgueres artesanais smash • Batatas Rústicas • Bebidas Geladas',
      category: 'Burgers & Smash',
      deliveryFee: 0,
      deliveryTime: '25-35 min',
      rating: 4.9,
      imageUrl: '/images/restaurants/burger.jpg',
    },
    create: {
      id: 'rest-123',
      name: 'Paraíso Smash Burger',
      description: 'Hambúrgueres artesanais smash • Batatas Rústicas • Bebidas Geladas',
      address: 'Praça Cel. José Vieira, 12 — Centro, Paraisópolis - MG',
      latitude: -22.5538,
      longitude: -45.7796,
      imageUrl: '/images/restaurants/burger.jpg',
      category: 'Burgers & Smash',
      deliveryFee: 0,
      deliveryTime: '25-35 min',
      rating: 4.9,
      ownerId: ownerSmash.id,
    },
  });

  // Cardápio — Paraíso Smash Burger
  const menuSmash = [
    {
      id: 'item-1',
      name: 'Smash Burger Mantiqueira',
      description: 'Dois burgers artesanais 90g, cheddar inglês derretido, cebola caramelizada no vinho e maionese defumada no pão brioche.',
      price: 34.90,
      category: 'Lanches',
      imageUrl: '/images/products/burger/smash-mantiqueira.jpg',
    },
    {
      id: 'item-2',
      name: 'X-Tudo Paraisópolis',
      description: 'Hambúrguer 150g, queijo prato, presunto, bacon, ovo caipira, alface, tomate e milho verde.',
      price: 28.90,
      category: 'Lanches',
      imageUrl: '/images/products/burger/x-tudo.jpg',
    },
    {
      id: 'item-3',
      name: 'Batata Rústica com Alecrim',
      description: '500g de batatas rústicas douradas temperadas com alecrim fresco, flor de sal e alho confit.',
      price: 22.00,
      category: 'Acompanhamentos',
      imageUrl: '/images/products/burger/batata-rustica.jpg',
    },
    {
      id: 'item-4',
      name: 'Onion Rings Artesanais',
      description: 'Anéis de cebola com empanado crocante e molho barbecue defumado. Porção com 8 unidades.',
      price: 18.00,
      category: 'Acompanhamentos',
      imageUrl: '/images/products/burger/onion-rings.jpg',
    },
    {
      id: 'item-5',
      name: 'Milkshake Creme de Avelã',
      description: 'Milkshake cremoso de Nutella com chantilly e raspas de chocolate meio amargo. 500ml.',
      price: 24.00,
      category: 'Bebidas',
      imageUrl: '/images/products/burger/milkshake-avela.jpg',
    },
    {
      id: 'item-6',
      name: 'Refrigerante Gelado',
      description: 'Lata 350ml bem gelada. Opções: Coca-Cola, Guaraná Antarctica, Sprite.',
      price: 6.00,
      category: 'Bebidas',
      imageUrl: '/images/products/burger/refrigerante.jpg',
    },
  ];

  // ─── Restaurante 2: Pizzaria Bella Paraisópolis ────────────────────────────
  // ─── Restaurante 2: Pizzaria Bella Paraisópolis ────────────────────────────
  const rest2 = await prisma.restaurant.upsert({
    where: { ownerId: ownerPizza.id },
    update: {
      category: 'Pizzaria Artesanal',
      deliveryFee: 4.99,
      deliveryTime: '35-50 min',
      rating: 4.8,
      imageUrl: '/images/restaurants/pizza.jpg',
    },
    create: {
      id: 'rest-pizza',
      name: 'Pizzaria Bella Paraisópolis',
      description: 'Pizzas napolitanas clássicas e criativas • Massas longas • Sobremesas Italianas',
      address: 'Rua Cel. José Vieira, 89 — Centro, Paraisópolis - MG',
      latitude: -22.5545,
      longitude: -45.7801,
      imageUrl: '/images/restaurants/pizza.jpg',
      category: 'Pizzaria Artesanal',
      deliveryFee: 4.99,
      deliveryTime: '35-50 min',
      rating: 4.8,
      ownerId: ownerPizza.id,
    },
  });

  // Cardápio — Pizzaria Bella
  const menuPizza = [
    {
      id: 'pizza-1',
      name: 'Margherita Napolitana',
      description: 'Molho San Marzano, mozarella de búfala, manjericão fresco e azeite de oliva extra virgem. Borda recheada.',
      price: 52.90,
      category: 'Pizzas Tradicionais',
      imageUrl: '/images/products/pizza/margherita.jpg',
    },
    {
      id: 'pizza-2',
      name: 'Calabresa Defumada',
      description: 'Generosa quantidade de calabresa defumada fatiada, cebola roxa, azeitonas e orégano.',
      price: 48.90,
      category: 'Pizzas Tradicionais',
      imageUrl: '/images/products/pizza/calabresa.jpg',
    },
    {
      id: 'pizza-3',
      name: 'Quatro Queijos Premium',
      description: 'Mozarella, gorgonzola suave, parmesão ralado e provolone derretido. Finalizada com mel de abelha.',
      price: 58.90,
      category: 'Pizzas Especiais',
      imageUrl: '/images/products/pizza/quatro-queijos.jpg',
    },
    {
      id: 'pizza-4',
      name: 'Nutella & Morango',
      description: 'Pizza doce com Nutella, morangos frescos, chantilly e açúcar de baunilha. A favorita!',
      price: 44.90,
      category: 'Pizzas Doces',
      imageUrl: '/images/products/pizza/nutella-morango.jpg',
    },
    {
      id: 'pizza-5',
      name: 'Suco de Uva Integral 500ml',
      description: 'Suco de uva integral natural integral, sem adição de açúcar. Bem gelado.',
      price: 11.00,
      category: 'Bebidas',
      imageUrl: '/images/products/pizza/suco-uva.jpg',
    },
  ];

  // ─── Restaurante 3: Açaí & Doceria da Serra ───────────────────────────────
  const rest3 = await prisma.restaurant.upsert({
    where: { ownerId: ownerAcai.id },
    update: {
      category: 'Doceria & Açaí',
      deliveryFee: 0,
      deliveryTime: '20-30 min',
      rating: 5.0,
      imageUrl: '/images/restaurants/acai.jpg',
    },
    create: {
      id: 'rest-acai',
      name: 'Açaí & Doceria da Serra',
      description: 'Tigelas de açaí premium da Amazônia • Milkshakes artesanais • Bolos caseiros',
      address: 'Av. Brasil, 201 — Bairro Novo, Paraisópolis - MG',
      latitude: -22.5525,
      longitude: -45.7780,
      imageUrl: '/images/restaurants/acai.jpg',
      category: 'Doceria & Açaí',
      deliveryFee: 0,
      deliveryTime: '20-30 min',
      rating: 5.0,
      ownerId: ownerAcai.id,
    },
  });

  // Cardápio — Açaí da Serra
  const menuAcai = [
    {
      id: 'acai-1',
      name: 'Tigela de Açaí Premium 500ml',
      description: 'Açaí puro da Amazônia, banana caramelizada, granola crocante, mel e leite condensado.',
      price: 26.90,
      category: 'Açaí',
      imageUrl: '/images/products/acai/tigela-acai.jpg',
    },
    {
      id: 'acai-2',
      name: 'Milkshake Morango & Oreo',
      description: 'Milkshake espesso de morango fresco com biscoito Oreo triturado, chantilly e calda. 500ml.',
      price: 22.00,
      category: 'Milkshakes',
      imageUrl: '/images/products/acai/milkshake-morango-oreo.jpg',
    },
    {
      id: 'acai-3',
      name: 'Bolo de Cenoura com Ganache',
      description: 'Fatia generosa de bolo de cenoura fofinho com cobertura de ganache de chocolate 70%.',
      price: 14.00,
      category: 'Doces',
      imageUrl: '/images/products/acai/bolo-cenoura.jpg',
    },
    {
      id: 'acai-4',
      name: 'Pudim de Leite Moça',
      description: 'Fatia artesanal de pudim super cremoso com calda de caramelo brilhante.',
      price: 12.00,
      category: 'Doces',
      imageUrl: '/images/products/acai/pudim-leite.jpg',
    },
  ];

  // ─── Restaurante 4: Sushi Hub Paraisópolis ────────────────────────────────
  const rest4 = await prisma.restaurant.upsert({
    where: { ownerId: ownerSushi.id },
    update: {
      category: 'Comida Japonesa',
      deliveryFee: 7.50,
      deliveryTime: '40-55 min',
      rating: 4.7,
      imageUrl: '/images/restaurants/sushi.jpg',
    },
    create: {
      id: 'rest-sushi',
      name: 'Sushi Hub Paraisópolis',
      description: 'Combinados de sushi • Temakis Crocantes • Pokes • Hot Rolls',
      address: 'Rua das Flores, 55 — Bairro Esperança, Paraisópolis - MG',
      latitude: -22.5560,
      longitude: -45.7810,
      imageUrl: '/images/restaurants/sushi.jpg',
      category: 'Comida Japonesa',
      deliveryFee: 7.50,
      deliveryTime: '40-55 min',
      rating: 4.7,
      ownerId: ownerSushi.id,
    },
  });

  // Cardápio — Sushi Hub
  const menuSushi = [
    {
      id: 'sushi-1',
      name: 'Combinado Especial 30 Peças',
      description: 'Seleção premium com salmão, atum, camarão e cream cheese. 10 nigiris, 10 sashimis e 10 uramakis.',
      price: 89.90,
      category: 'Combinados',
      imageUrl: '/images/products/sushi/combinado-30-pecas.jpg',
    },
    {
      id: 'sushi-2',
      name: 'Temaki Salmão Crocante',
      description: 'Cone grande de alga, salmão fresco, cream cheese e cebolinha, coberto com tempurinha crocante.',
      price: 24.90,
      category: 'Temakis',
      imageUrl: '/images/products/sushi/temaki-salmao.jpg',
    },
    {
      id: 'sushi-3',
      name: 'Poke Bowl de Salmão',
      description: 'Arroz temperado, salmão fresco marinado, edamame, pepino, cenoura, abacate e molho shoyu especial.',
      price: 42.90,
      category: 'Pokes',
      imageUrl: '/images/products/sushi/poke-salmao.jpg',
    },
    {
      id: 'sushi-4',
      name: 'Hot Roll Camarão 8 Unidades',
      description: 'Uramaki empanado e frito, recheio de camarão empanado com cream cheese e maionese spicy.',
      price: 34.90,
      category: 'Hot Rolls',
      imageUrl: '/images/products/sushi/hot-roll-camarao.jpg',
    },
    {
      id: 'sushi-5',
      name: 'Água de Coco 300ml',
      description: 'Água de coco natural gelada em caixinha.',
      price: 8.00,
      category: 'Bebidas',
      imageUrl: '/images/products/sushi/agua-de-coco.jpg',
    },
  ];

  // ─── Seed dos itens dos 4 restaurantes ────────────────────────────────────
  const allMenuItems = [
    ...menuSmash.map((item) => ({ ...item, restaurantId: rest1.id })),
    ...menuPizza.map((item) => ({ ...item, restaurantId: rest2.id })),
    ...menuAcai.map((item) => ({ ...item, restaurantId: rest3.id })),
    ...menuSushi.map((item) => ({ ...item, restaurantId: rest4.id })),
  ];

  for (const item of allMenuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl,
        restaurantId: item.restaurantId,
        isAvailable: true,
      },
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl,
        restaurantId: item.restaurantId,
        isAvailable: true,
      },
    });
  }

  console.log(`✅ Seeding finalizado!`);
  console.log(`   • 4 restaurantes em Paraisópolis`);
  console.log(`   • ${allMenuItems.length} itens de cardápio`);
  console.log(`   • Usuários: cliente@teste.com / dono@restaurante.com / driver@teste.com`);
  console.log(`   • Senha para todos: 123456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
