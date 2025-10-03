import { prisma, initializeDatabaseConfig } from '@msq-tx-monitor/database';
import { PolygonScanClient } from './polygonscan';
import { TokenConfig, TransactionData } from './types';
import { convertToTransactionData, chunkArray, formatNumber } from './utils';
import axios from 'axios';

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
 * Save transactions to database in batches with transaction protection
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
      // Wrap each batch in a database transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        return await tx.transaction.createMany({
          data: chunk.map(transaction => ({
            hash: transaction.hash,
            blockNumber: transaction.blockNumber,
            transactionIndex: transaction.transactionIndex,
            fromAddress: transaction.fromAddress,
            toAddress: transaction.toAddress,
            value: transaction.value,
            tokenAddress: transaction.tokenAddress,
            tokenSymbol: transaction.tokenSymbol,
            tokenDecimals: transaction.tokenDecimals,
            gasUsed: transaction.gasUsed,
            gasPrice: transaction.gasPrice,
            timestamp: transaction.timestamp,
            status: transaction.status,
          })),
          skipDuplicates: true,
        });
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
 * Get current block number from Polygon RPC
 */
async function getCurrentBlockNumber(): Promise<number> {
  try {
    const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1,
    });

    const blockNumberHex = response.data.result;
    const blockNumber = parseInt(blockNumberHex, 16);

    console.log(`📍 Current Polygon block number: ${formatNumber(blockNumber)}`);
    return blockNumber;
  } catch (error) {
    console.error('❌ Error fetching current block number:', error);
    throw error;
  }
}

/**
 * Update BlockProcessingStatus table with sync completion
 */
async function updateBlockProcessingStatus(blockNumber: number): Promise<void> {
  try {
    await prisma.blockProcessingStatus.upsert({
      where: { chainId: 137 }, // Polygon mainnet
      update: {
        lastProcessedBlock: BigInt(blockNumber),
        currentBlock: BigInt(blockNumber),
        isSyncing: false,
        lastSyncAt: new Date(),
      },
      create: {
        chainId: 137,
        lastProcessedBlock: BigInt(blockNumber),
        currentBlock: BigInt(blockNumber),
        isSyncing: false,
      },
    });

    console.log(`✅ Updated BlockProcessingStatus: lastProcessedBlock = ${formatNumber(blockNumber)}`);
  } catch (error) {
    console.error('❌ Error updating BlockProcessingStatus:', error);
    throw error;
  }
}

/**
 * Sync historical data for a single token (streaming approach)
 */
async function syncToken(
  client: PolygonScanClient,
  token: TokenConfig,
  endBlock?: number
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Syncing ${token.symbol} (${token.address})`);
  console.log(`   Deployment Block: ${formatNumber(token.deploymentBlock)}`);
  if (endBlock) {
    console.log(`   Target End Block: ${formatNumber(endBlock)}`);
  }
  console.log(`${'='.repeat(60)}\n`);

  let totalFetched = 0;
  let totalSaved = 0;
  let totalFiltered = 0;

  try {
    // Stream transactions and process each batch immediately
    totalFetched = await client.streamTokenTransfers(
      token.address,
      token.deploymentBlock,
      endBlock,
      async (batch, iteration) => {
        // Convert to database format
        const dbTransactions = batch.map(convertToTransactionData);

        // Filter out zero-value transactions
        const validTransactions = dbTransactions.filter(tx => BigInt(tx.value) > 0n);

        totalFiltered += dbTransactions.length - validTransactions.length;

        if (validTransactions.length === 0) {
          console.log(`    ⏭️  Batch ${iteration}: All transactions have zero value, skipping save`);
          return;
        }

        // Save to database with transaction protection
        console.log(`  💾 Saving batch ${iteration} to database...\n`);
        const savedCount = await saveTransactionsBatch(validTransactions);
        totalSaved += savedCount;

        console.log(
          `  📊 Batch ${iteration} summary: ` +
          `Fetched ${batch.length}, ` +
          `Valid ${validTransactions.length}, ` +
          `Saved ${savedCount}, ` +
          `Zero-value ${dbTransactions.length - validTransactions.length}\n`
        );
      }
    );

    console.log(`\n  ✅ ${token.symbol} sync completed!`);
    console.log(`     Total fetched: ${formatNumber(totalFetched)}`);
    console.log(`     Total saved: ${formatNumber(totalSaved)}`);
    console.log(`     Zero-value filtered: ${formatNumber(totalFiltered)}`);
    console.log(`     Duplicates skipped: ${formatNumber(totalFetched - totalFiltered - totalSaved)}\n`);
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

    // Get current block number for sync:all mode
    let syncEndBlock: number | undefined;
    if (tokenArg === 'ALL') {
      syncEndBlock = await getCurrentBlockNumber();
      console.log(`\n🎯 Syncing ALL tokens to block ${formatNumber(syncEndBlock)}\n`);
    }

    // Sync each token
    for (const token of tokensToSync) {
      await syncToken(client, token, syncEndBlock);
    }

    // Update BlockProcessingStatus if syncing all tokens
    if (tokenArg === 'ALL' && syncEndBlock) {
      console.log('\n📝 Updating BlockProcessingStatus...');
      await updateBlockProcessingStatus(syncEndBlock);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All sync operations completed successfully!');
    if (syncEndBlock) {
      console.log(`🎯 All tokens synced to block: ${formatNumber(syncEndBlock)}`);
      console.log(`✅ BlockProcessingStatus updated`);
      console.log(`📡 chain-scanner will continue from block ${formatNumber(syncEndBlock + 1)}`);
    }
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
