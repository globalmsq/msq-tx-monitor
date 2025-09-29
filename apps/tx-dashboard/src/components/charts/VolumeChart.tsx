import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { getTokenDecimals } from '../../config/tokens';

interface VolumeDataPoint {
  timestamp: string;
  hour: string;
  totalVolume: string;
  transactionCount: number;
  averageVolume: string;
  tokenSymbol?: string;
}

interface VolumeChartProps {
  data: VolumeDataPoint[];
  height?: number;
  showGrid?: boolean;
  gradient?: boolean;
  tokenSymbol?: string; // Add tokenSymbol prop for proper decimal formatting
}

// Custom tooltip component
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as VolumeDataPoint;

    // Use hour field instead of timestamp, with error handling
    const dateStr = data.timestamp || data.hour;
    const isValidDate = dateStr && !isNaN(new Date(dateStr).getTime());

    return (
      <div className='bg-gray-900/95 backdrop-blur border border-white/20 rounded-lg p-3 shadow-xl'>
        <p className='text-white font-medium mb-2'>
          {isValidDate
            ? formatDistanceToNow(new Date(dateStr), { addSuffix: true })
            : 'Time unavailable'
          }
        </p>
        <div className='space-y-1'>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-primary-400 text-sm'>Volume:</span>
            <span className='text-white font-mono'>
              {formatVolume(data.totalVolume, data.tokenSymbol)}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-blue-400 text-sm'>Transactions:</span>
            <span className='text-white'>
              {data.transactionCount.toLocaleString()}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-green-400 text-sm'>Avg Volume:</span>
            <span className='text-white font-mono'>
              {formatVolume(data.averageVolume, data.tokenSymbol)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// Volume formatting helper
function formatVolume(volume: string, tokenSymbol?: string): string {
  const decimals = tokenSymbol ? getTokenDecimals(tokenSymbol) : 18;
  const num = parseFloat(volume) / Math.pow(10, decimals);
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(4);
}

// Format hour for X-axis
function formatHour(hour: string): string {
  const date = new Date(hour);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function VolumeChart({
  data,
  height = 300,
  showGrid = true,
  gradient = true,
  tokenSymbol,
}: VolumeChartProps) {
  // Transform data for chart display
  const chartData = data.map(item => {
    const decimals = getTokenDecimals(item.tokenSymbol || 'MSQ');
    return {
      ...item,
      timestamp: item.timestamp || item.hour, // Ensure timestamp field exists
      volumeDisplay: parseFloat(item.totalVolume) / Math.pow(10, decimals),
      avgVolumeDisplay: parseFloat(item.averageVolume) / Math.pow(10, decimals),
      hourLabel: formatHour(item.hour),
    };
  });

  return (
    <div className='w-full' style={{ height }}>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          {gradient && (
            <defs>
              <linearGradient id='volumeGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='#8b5cf6' stopOpacity={0.8} />
                <stop offset='95%' stopColor='#8b5cf6' stopOpacity={0.1} />
              </linearGradient>
              <linearGradient
                id='avgVolumeGradient'
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop offset='5%' stopColor='#06b6d4' stopOpacity={0.6} />
                <stop offset='95%' stopColor='#06b6d4' stopOpacity={0.1} />
              </linearGradient>
            </defs>
          )}

          {showGrid && (
            <CartesianGrid
              strokeDasharray='3 3'
              stroke='rgba(255,255,255,0.1)'
            />
          )}

          <XAxis
            dataKey='hourLabel'
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            interval='preserveStartEnd'
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            tickFormatter={value => {
              const decimals = getTokenDecimals(tokenSymbol || 'MSQ');
              return formatVolume((value * Math.pow(10, decimals)).toString(), tokenSymbol);
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type='monotone'
            dataKey='volumeDisplay'
            stroke='#8b5cf6'
            strokeWidth={2}
            fill={gradient ? 'url(#volumeGradient)' : '#8b5cf6'}
            fillOpacity={gradient ? 1 : 0.3}
            name='Total Volume'
          />

          <Area
            type='monotone'
            dataKey='avgVolumeDisplay'
            stroke='#06b6d4'
            strokeWidth={1.5}
            fill={gradient ? 'url(#avgVolumeGradient)' : '#06b6d4'}
            fillOpacity={gradient ? 1 : 0.2}
            name='Average Volume'
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
