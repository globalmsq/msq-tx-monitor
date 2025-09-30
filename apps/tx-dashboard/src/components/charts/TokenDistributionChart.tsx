import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { formatVolume, formatPercentage } from '@msq-tx-monitor/msq-common';
import { TOKEN_CONFIG } from '../../config/tokens';

interface TokenDistribution {
  tokenSymbol: string;
  transactionCount: number;
  volume: string;
  percentage: number;
  color: string;
}

export interface TokenDistributionChartProps {
  data: TokenDistribution[];
  height?: number;
  showLegend?: boolean;
  metric?: 'volume' | 'transactions';
}

// Custom tooltip component
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TokenDistribution;
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TokenDistribution;

    return (
      <div className='bg-gray-900/95 backdrop-blur border border-white/20 rounded-lg p-3 shadow-xl'>
        <p className='text-white font-bold mb-2 text-center'>
          {data.tokenSymbol}
        </p>
        <div className='space-y-1'>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-white/70 text-sm'>Share:</span>
            <span className='text-white font-bold'>
              {formatPercentage(data.percentage, 1)}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-white/70 text-sm'>Volume:</span>
            <span className='text-white font-mono'>
              {formatVolumeHelper(data.volume, data.tokenSymbol)}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-white/70 text-sm'>Transactions:</span>
            <span className='text-white'>
              {data.transactionCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// Custom legend component
interface LegendProps {
  payload?: Array<{
    value: string;
    type: string;
    color: string;
    payload: TokenDistribution;
  }>;
}

function CustomLegend({ payload }: LegendProps) {
  if (!payload) return null;

  return (
    <div className='flex flex-wrap justify-center gap-4 mt-4'>
      {payload.map((entry, index: number) => (
        <div key={index} className='flex items-center gap-2'>
          <div
            className='w-3 h-3 rounded-full'
            style={{ backgroundColor: entry.color }}
          />
          <span className='text-white/80 text-sm font-medium'>
            {entry.value}
          </span>
          <span className='text-white/60 text-sm'>
            ({formatPercentage(entry.payload.percentage, 1)})
          </span>
        </div>
      ))}
    </div>
  );
}

// Volume formatting helper
// Volume formatting helper - using common formatter with 1 decimal place
function formatVolumeHelper(volume: string, tokenSymbol?: string): string {
  return formatVolume(volume, tokenSymbol, { precision: 1, showSymbol: false });
}

// Default colors for tokens
const DEFAULT_COLORS = [
  '#8b5cf6', // Purple (MSQ)
  '#06b6d4', // Cyan (SUT)
  '#10b981', // Emerald (KWT)
  '#f59e0b', // Amber (P2UC)
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#84cc16', // Lime
];

export function TokenDistributionChart({
  data,
  height = 300,
  showLegend = true,
  metric = 'volume',
}: TokenDistributionChartProps) {
  // Ensure data has colors
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    // Determine value based on metric
    value:
      metric === 'volume'
        ? parseFloat(item.volume) /
          Math.pow(10, TOKEN_CONFIG[item.tokenSymbol]?.decimals || 18)
        : item.transactionCount,
  }));

  // Custom label function
  const renderLabel = (entry: Record<string, unknown>) => {
    const percentage = entry.percentage as number;
    return percentage > 5 ? formatPercentage(percentage, 1) : '';
  };

  return (
    <div
      className='w-full'
      style={{ height: showLegend ? height + 80 : height }}
    >
      <ResponsiveContainer width='100%' height='100%'>
        <PieChart>
          <Pie
            data={chartData}
            cx='50%'
            cy='50%'
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill='#8884d8'
            dataKey='value'
            strokeWidth={2}
            stroke='rgba(255,255,255,0.1)'
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                }}
              />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip />} />

          {showLegend && (
            <Legend
              content={<CustomLegend />}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Metric Toggle */}
      <div className='flex justify-center mt-4'>
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
        </div>
      </div>
    </div>
  );
}
