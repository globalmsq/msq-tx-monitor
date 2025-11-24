import { fetchRecentTransfers, formatTokenAmount } from '@/lib/subgraph';
import { Card } from '@/components/ui/Card';
import type { GetTransfersQuery } from '@msq-tx-monitor/subgraph-client';

// Extract transfer type from query result
type TransferData = GetTransfersQuery['transfers'][number];

export async function TransactionList() {
  // Fetch data on server side
  const transfers = await fetchRecentTransfers(20);

  if (!transfers || transfers.length === 0) {
    return (
      <Card>
        <p className='text-gray-600 dark:text-gray-400 text-center py-8'>
          No recent transactions found
        </p>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-2xl font-bold'>Recent Transactions</h2>

      <div className='space-y-2'>
        {transfers.map((transfer: TransferData) => {
          const timestamp = new Date(
            Number(transfer.blockTimestamp) * 1000
          ).toLocaleString();
          const amount = formatTokenAmount(
            transfer.amount,
            transfer.token.decimals
          );

          return (
            <Card
              key={transfer.id}
              className='hover:shadow-lg transition-shadow'
            >
              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Token
                  </p>
                  <p className='font-semibold'>{transfer.token.symbol}</p>
                </div>

                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Amount
                  </p>
                  <p className='font-mono'>{amount}</p>
                </div>

                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    From → To
                  </p>
                  <p className='text-sm truncate'>
                    {transfer.from.slice(0, 8)}...
                    {transfer.from.slice(-6)} → {transfer.to.slice(0, 8)}...
                    {transfer.to.slice(-6)}
                  </p>
                </div>

                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Time
                  </p>
                  <p className='text-sm'>{timestamp}</p>
                </div>
              </div>

              <div className='mt-2 pt-2 border-t border-gray-200 dark:border-gray-700'>
                <a
                  href={`https://polygonscan.com/tx/${transfer.transactionHash}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-xs text-primary-600 hover:text-primary-700'
                >
                  View on PolygonScan →
                </a>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
