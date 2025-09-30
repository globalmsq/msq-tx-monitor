import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatVolume, formatNumber } from '@msq-tx-monitor/msq-common';
import { TOKEN_CONFIG } from '../../config/tokens';

interface TopAddress {
  address: string;
  totalVolume: string;
  transactionCount: number;
  uniqueInteractions: number;
  rank?: number;
  tokenSymbol?: string;
}

export interface AddressActivityChartProps {
  data: TopAddress[];
  height?: number;
  showGrid?: boolean;
  metric?: 'volume' | 'transactions' | 'interactions';
  tokenSymbol?: string;
}

// Custom tooltip component
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TopAddress & { displayValue: number };
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TopAddress & { displayValue: number };

    return (
      <div className='bg-gray-900/95 backdrop-blur border border-white/20 rounded-lg p-3 shadow-xl'>
        <p className='text-white font-mono font-bold mb-2'>
          {data.address.slice(0, 6)}...{data.address.slice(-4)}
        </p>
        <div className='space-y-1'>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-primary-400 text-sm'>Volume:</span>
            <span className='text-white font-mono'>
              {formatVolumeHelper(data.totalVolume, data.tokenSymbol)}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-blue-400 text-sm'>Transactions:</span>
            <span className='text-white'>
              {data.transactionCount.toLocaleString()}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-green-400 text-sm'>Token Types:</span>
            <span className='text-white'>{data.uniqueInteractions}</span>
          </div>
          {data.rank && (
            <div className='flex items-center justify-between gap-4'>
              <span className='text-yellow-400 text-sm'>Rank:</span>
              <span className='text-white font-bold'>#{data.rank}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

// Volume formatting helper
// Volume formatting helper - using common formatter with 1 decimal place
function formatVolumeHelper(volume: string, tokenSymbol?: string): string {
  return formatVolume(volume, tokenSymbol, { precision: 1, showSymbol: false });
}

// Format address for display
function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AddressActivityChart({
  data,
  height = 400,
  showGrid = true,
  metric = 'volume',
  tokenSymbol,
}: AddressActivityChartProps) {
  // Transform data for chart display
  const chartData = data.map((item, index) => {
    let displayValue: number;
    let barColor: string;

    switch (metric) {
      case 'transactions':
        displayValue = item.transactionCount;
        barColor = '#06b6d4';
        break;
      case 'interactions':
        displayValue = item.uniqueInteractions;
        barColor = '#10b981';
        break;
      default: {
        // volume
        const decimals =
          item.tokenSymbol || tokenSymbol
            ? TOKEN_CONFIG[item.tokenSymbol || tokenSymbol || '']?.decimals ||
              18
            : 18;
        displayValue = parseFloat(item.totalVolume) / Math.pow(10, decimals);
        barColor = '#8b5cf6';
        break;
      }
    }

    return {
      ...item,
      addressLabel: formatAddress(item.address),
      displayValue,
      barColor,
      rank: index + 1,
    };
  });

  // Format Y-axis values based on metric
  const formatYAxis = (value: number) => {
    switch (metric) {
      case 'volume': {
        const decimals = tokenSymbol
          ? TOKEN_CONFIG[tokenSymbol]?.decimals || 18
          : 18;
        return formatVolumeHelper(
          (value * Math.pow(10, decimals)).toString(),
          tokenSymbol
        );
      }
      case 'transactions':
        return value >= 1000
          ? formatNumber(value, { precision: 1 })
          : value.toString();
      case 'interactions':
        return value.toString();
      default:
        return value.toString();
    }
  };

  // Get metric labels
  const getMetricLabel = () => {
    switch (metric) {
      case 'volume':
        return 'Total Volume';
      case 'transactions':
        return 'Transaction Count';
      case 'interactions':
        return 'Token Interactions';
      default:
        return 'Value';
    }
  };

  return (
    <div className='w-full space-y-4'>
      {/* Metric Toggle */}
      <div className='flex justify-center'>
        <div className='bg-white/5 rounded-lg p-1 inline-flex'>
          <button
            className={`px-3 py-1 rounded text-sm transition-colors ${
              metric === 'volume'
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            By Volume
          </button>
          <button
            className={`px-3 py-1 rounded text-sm transition-colors ${
              metric === 'transactions'
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            By Transactions
          </button>
          <button
            className={`px-3 py-1 rounded text-sm transition-colors ${
              metric === 'interactions'
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            By Tokens
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className='w-full' style={{ height }}>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='rgba(255,255,255,0.1)'
              />
            )}

            <XAxis
              dataKey='addressLabel'
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
              angle={-45}
              textAnchor='end'
              height={60}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
              tickFormatter={formatYAxis}
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar
              dataKey='displayValue'
              fill='url(#barGradient)'
              radius={[4, 4, 0, 0]}
              name={getMetricLabel()}
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient id='barGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop
                  offset='5%'
                  stopColor={chartData[0]?.barColor || '#8b5cf6'}
                  stopOpacity={0.9}
                />
                <stop
                  offset='95%'
                  stopColor={chartData[0]?.barColor || '#8b5cf6'}
                  stopOpacity={0.3}
                />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 3 Summary */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
        {chartData.slice(0, 3).map((address, index) => (
          <div key={address.address} className='bg-white/5 rounded-lg p-3'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-white/60 text-sm'>
                #{index + 1} Address
              </span>
              <div className='w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold text-black'>
                {index + 1}
              </div>
            </div>
            <div className='text-white font-mono text-sm mb-1'>
              {formatAddress(address.address)}
            </div>
            <div className='text-primary-400 font-bold'>
              {metric === 'volume' &&
                formatVolumeHelper(
                  address.totalVolume,
                  address.tokenSymbol || tokenSymbol
                )}
              {metric === 'transactions' &&
                address.transactionCount.toLocaleString()}
              {metric === 'interactions' &&
                `${address.uniqueInteractions} tokens`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
