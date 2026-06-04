import { prisma } from '../lib/db/client'

async function main() {
  console.log('Truncating database...');
  const tableNames: any = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
  
  for (const { tablename } of tableNames) {
    if (tablename !== '_prisma_migrations') {
      try {
        console.log(`Truncating ${tablename}...`)
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
      } catch (e: any) {
        console.error('Failed to truncate', tablename, e.message);
      }
    }
  }
  console.log('Wipe complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
