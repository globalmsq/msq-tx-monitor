import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MSQ_TOKENS = [
  {
    address: '0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499',
    symbol: 'MSQ',
    name: 'MSQ Token',
    decimals: 18,
  },
  {
    address: '0x435001Af7fC65B621B0043df99810B2f30860c5d',
    symbol: 'KWT',
    name: 'KWT Token',
    decimals: 6,
  },
  {
    address: '0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55',
    symbol: 'SUT',
    name: 'SUT Token',
    decimals: 18,
  },
  {
    address: '0x8B3C6ff5911392dECB5B08611822280dEe0E4f64',
    symbol: 'P2UC',
    name: 'P2UC Token',
    decimals: 18,
  },
];

async function main() {
  console.log('🌱 Seeding MSQ ecosystem tokens...');

  for (const token of MSQ_TOKENS) {
    const existingToken = await prisma.token.findUnique({
      where: { address: token.address },
    });

    if (existingToken) {
      console.log(`✅ Token ${token.symbol} already exists, updating...`);
      await prisma.token.update({
        where: { address: token.address },
        data: {
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          isActive: true,
        },
      });
    } else {
      console.log(`➕ Creating token ${token.symbol}...`);
      await prisma.token.create({
        data: token,
      });
    }
  }

  // Initialize block processing status for Polygon network
  const blockStatus = await prisma.blockProcessingStatus.findUnique({
    where: { chainId: 137 },
  });

  if (!blockStatus) {
    console.log('📦 Initializing block processing status...');
    await prisma.blockProcessingStatus.create({
      data: {
        chainId: 137,
        lastProcessedBlock: 0,
        currentBlock: 0,
        isSyncing: false,
      },
    });
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
