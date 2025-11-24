import {
  fetchTokenStatistics,
  formatLargeNumber,
  formatTokenAmount,
} from '@/lib/subgraph';
import { Card } from '@/components/ui/Card';
import type { GetTokensQuery } from '@msq-tx-monitor/subgraph-client';

// Extract token type from query result
type TokenData = GetTokensQuery['tokens'][number];

export async function TokenStatistics() {
  // Fetch data on server side
  const tokens = await fetchTokenStatistics();

  if (!tokens || tokens.length === 0) {
    return (
      <Card>
        <p className='text-gray-600 dark:text-gray-400 text-center py-8'>
          No token statistics available
        </p>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-2xl font-bold'>Token Statistics</h2>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {tokens.map((token: TokenData) => {
          const totalSupply = formatTokenAmount(
            token.totalSupply,
            token.decimals
          );
          const holderCount = formatLargeNumber(Number(token.holderCount));

          return (
            <Card key={token.id} className='hover:shadow-lg transition-shadow'>
              <div className='space-y-3'>
                {/* Token Header */}
                <div className='flex items-center justify-between'>
                  <h3 className='text-xl font-bold text-primary-600'>
                    {token.symbol}
                  </h3>
                  <span className='text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900 rounded'>
                    {token.name}
                  </span>
                </div>

                {/* Statistics */}
                <div className='space-y-2'>
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Total Supply
                    </p>
                    <p className='font-mono text-lg'>{totalSupply}</p>
                  </div>

                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Holders
                    </p>
                    <p className='font-semibold'>{holderCount}</p>
                  </div>
                </div>

                {/* Address Link */}
                <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
                  <a
                    href={`https://polygonscan.com/token/${token.address}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-xs text-primary-600 hover:text-primary-700'
                  >
                    View on PolygonScan →
                  </a>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
