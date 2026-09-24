import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpando todos os pedidos em aberto e histórico de teste...');

  const deletedHistory = await prisma.orderStatusHistory.deleteMany({});
  console.log(`- Histórico de status removido: ${deletedHistory.count}`);

  const deletedItems = await prisma.orderItem.deleteMany({});
  console.log(`- Itens de pedidos removidos: ${deletedItems.count}`);

  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`Total de pedidos removidos: ${deletedOrders.count}`);

  console.log('Fila do KDS limpa com sucesso! O sistema está pronto para novos pedidos.');
}

main()
  .catch((e) => {
    console.error('Erro ao limpar pedidos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
