import { prisma, initializeDatabaseConfig } from '@msq-tx-monitor/database';
import { PolygonScanClient } from './polygonscan';
import { TokenConfig, TransactionData } from './types';
import { convertToTransactionData, chunkArray, formatNumber } from './utils';

// Token configurations
const TOKENS: Record<string, TokenConfig> = {
  MSQ: {
    symbol: 'MSQ',
    address: '0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499',
    deploymentBlock: 28385214,
  },
  KWT: {
    symbol: 'KWT',
    address: '0x435001Af7fC65B621B0043df99810B2f30860c5d',
    deploymentBlock: 69407446,
  },
  SUT: {
    symbol: 'SUT',
    address: '0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55',
    deploymentBlock: 52882612,
  },
  P2UC: {
    symbol: 'P2UC',
    address: '0x8B3C6ff5911392dECB5B08611822280dEe0E4f64',
    deploymentBlock: 73725373,
  },
};

/**
 * Save transactions to database in batches
 */
async function saveTransactionsBatch(
  transactions: TransactionData[],
  batchSize: number = 1000
): Promise<number> {
  if (transactions.length === 0) {
    return 0;
  }

  const chunks = chunkArray(transactions, batchSize);
  let totalSaved = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const result = await prisma.transaction.createMany({
        data: chunk.map(tx => ({
          hash: tx.hash,
          blockNumber: tx.blockNumber,
          transactionIndex: tx.transactionIndex,
          fromAddress: tx.fromAddress,
          toAddress: tx.toAddress,
          value: tx.value,
          tokenAddress: tx.tokenAddress,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimals: tx.tokenDecimals,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          timestamp: tx.timestamp,
          status: tx.status,
        })),
        skipDuplicates: true,
      });

      totalSaved += result.count;

      console.log(
        `    💾 Batch ${i + 1}/${chunks.length}: Saved ${result.count}/${chunk.length} transactions`
      );
    } catch (error) {
      console.error(`    ❌ Error saving batch ${i + 1}:`, error);
      throw error;
    }
  }

  return totalSaved;
}

/**
 * Sync historical data for a single token
 */
async function syncToken(
  client: PolygonScanClient,
  token: TokenConfig
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Syncing ${token.symbol} (${token.address})`);
  console.log(`   Deployment Block: ${formatNumber(token.deploymentBlock)}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Fetch all transactions from PolygonScan
    const polygonScanTxs = await client.getAllTokenTransfers(
      token.address,
      token.deploymentBlock
    );

    console.log(`\n  📊 Total fetched: ${formatNumber(polygonScanTxs.length)} transactions\n`);

    if (polygonScanTxs.length === 0) {
      console.log(`  ℹ️  No transactions found for ${token.symbol}\n`);
      return;
    }

    // Convert to database format
    console.log(`  🔄 Converting to database format...`);
    const dbTransactions = polygonScanTxs.map(convertToTransactionData);

    // Save to database
    console.log(`  💾 Saving to database...\n`);
    const savedCount = await saveTransactionsBatch(dbTransactions);

    console.log(`\n  ✅ ${token.symbol} sync completed!`);
    console.log(`     Total fetched: ${formatNumber(polygonScanTxs.length)}`);
    console.log(`     Total saved: ${formatNumber(savedCount)}`);
    console.log(`     Duplicates skipped: ${formatNumber(polygonScanTxs.length - savedCount)}\n`);
  } catch (error) {
    console.error(`\n  ❌ Error syncing ${token.symbol}:`, error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const tokenArg = args
    .find(arg => arg.startsWith('--token='))
    ?.split('=')[1]
    ?.toUpperCase();

  // Validate arguments
  if (!tokenArg) {
    console.error('❌ Error: --token parameter is required');
    console.log('\nUsage:');
    console.log('  pnpm sync --token=MSQ');
    console.log('  pnpm sync --token=ALL');
    console.log('\nAvailable tokens: MSQ, KWT, SUT, P2UC, ALL');
    process.exit(1);
  }

  if (tokenArg !== 'ALL' && !TOKENS[tokenArg]) {
    console.error(`❌ Error: Invalid token "${tokenArg}"`);
    console.log('Available tokens: MSQ, KWT, SUT, P2UC, ALL');
    process.exit(1);
  }

  // Check API key
  const apiKey = process.env.POLYGONSCAN_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: POLYGONSCAN_API_KEY not found in environment variables');
    console.log('Please create a .env file with your PolygonScan API key');
    process.exit(1);
  }

  console.log('\n🚀 Token History Sync Utility');
  console.log('━'.repeat(60));
  console.log(`Target: ${tokenArg}`);
  console.log(`API Key: ${apiKey.substring(0, 8)}...`);
  console.log('━'.repeat(60));

  try {
    // Initialize database
    console.log('\n📊 Initializing database connection...');
    initializeDatabaseConfig();
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Initialize PolygonScan client
    const client = new PolygonScanClient(apiKey);

    // Determine which tokens to sync
    const tokensToSync: TokenConfig[] =
      tokenArg === 'ALL'
        ? Object.values(TOKENS)
        : [TOKENS[tokenArg]];

    // Sync each token
    for (const token of tokensToSync) {
      await syncToken(client, token);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All sync operations completed successfully!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
