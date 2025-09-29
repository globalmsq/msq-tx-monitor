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
            : 'Time unavailable'}
        </p>
        <div className='space-y-1'>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-sm' style={{ color: '#8b5cf6' }}>
              Volume:
            </span>
            <span className='text-white font-mono'>
              {formatVolume(data.totalVolume, data.tokenSymbol)}
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
  if (num >= 1e9) return Math.round(num / 1e9) + 'B';
  if (num >= 1e6) return Math.round(num / 1e6) + 'M';
  if (num >= 1e3) return Math.round(num / 1e3) + 'K';
  return Math.round(num).toString();
}

// Format hour for X-axis based on data length
function formatHour(hour: string, dataLength: number): string {
  const date = new Date(hour);

  if (dataLength <= 24) {
    // 1h, 24h: 시간만 표시
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } else if (dataLength <= 168) {
    // 7d: 월/일 시간 표시
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      hour12: false,
    });
  } else {
    // 30d: 월/일만 표시
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

export function VolumeChart({
  data,
  height = 300,
  showGrid = true,
  gradient = true,
  tokenSymbol,
}: VolumeChartProps) {
  // Transform data for chart display
  const chartData = data.map((item, index) => {
    const decimals = getTokenDecimals(item.tokenSymbol || 'MSQ');
    return {
      ...item,
      timestamp: item.timestamp || item.hour, // Ensure timestamp field exists
      volumeDisplay: parseFloat(item.totalVolume) / Math.pow(10, decimals),
      hourLabel: formatHour(item.hour, data.length),
      uniqueKey: `${item.hour}-${index}`, // 고유 키 추가
    };
  });

  // Calculate appropriate interval based on data length
  const getXAxisInterval = (dataLength: number) => {
    if (dataLength <= 24) return 'preserveStartEnd'; // 1h, 24h: show all or start/end
    if (dataLength <= 48) return 'preserveEnd'; // 2d: show end points
    if (dataLength <= 168) return 24; // 7d: show daily (every 24 hours)
    return 168; // 30d: show weekly (every 7 days = 168 hours)
  };

  const xAxisInterval = getXAxisInterval(chartData.length);

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
            interval={xAxisInterval}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            tickFormatter={value => {
              const decimals = getTokenDecimals(tokenSymbol || 'MSQ');
              return formatVolume(
                (value * Math.pow(10, decimals)).toString(),
                tokenSymbol
              );
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
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
