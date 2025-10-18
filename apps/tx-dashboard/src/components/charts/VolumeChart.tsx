import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatVolume, getTokenDecimals } from '@msq-tx-monitor/msq-common';

interface VolumeDataPoint {
  timestamp: string;
  datetime: string;
  totalVolume: string;
  transactionCount: number;
  averageVolume: string;
  tokenSymbol?: string;
}

export interface VolumeChartProps {
  data: VolumeDataPoint[];
  height?: number;
  showGrid?: boolean;
  gradient?: boolean;
  tokenSymbol?: string; // Add tokenSymbol prop for proper decimal formatting
  timeRange?: string; // Add timeRange for label formatting
}

// Custom tooltip component
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: VolumeDataPoint;
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as VolumeDataPoint;

    // Format date for tooltip
    const dateStr = data.timestamp || data.datetime;
    const formattedDate = formatTooltipDate(dateStr);

    // Calculate average transaction size
    const avgTransactionSize =
      data.transactionCount > 0
        ? formatVolumeHelper(
            (parseFloat(data.totalVolume) / data.transactionCount).toString(),
            data.tokenSymbol
          )
        : '0';

    return (
      <div className='bg-gray-900/95 backdrop-blur border border-white/20 rounded-lg p-3 shadow-xl'>
        <p className='text-white font-medium mb-2'>{formattedDate}</p>
        <div className='space-y-1'>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-sm' style={{ color: '#8b5cf6' }}>
              Volume:
            </span>
            <span className='text-white font-mono'>
              {formatVolumeHelper(data.totalVolume, data.tokenSymbol)}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span
              className='text-sm'
              style={{ color: 'rgba(34, 211, 238, 0.6)' }}
            >
              Transactions:
            </span>
            <span className='text-white font-mono'>
              {data.transactionCount.toLocaleString()}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-sm text-gray-400'>Avg Size:</span>
            <span className='text-white font-mono'>{avgTransactionSize}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// Volume formatting helper - using common formatter with 1 decimal place
function formatVolumeHelper(volume: string, tokenSymbol?: string): string {
  return formatVolume(volume, tokenSymbol, { precision: 1, showSymbol: false });
}

// Convert ISO week number to date (Monday of that week)
function getDateFromWeek(year: number, week: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

// Parse hour string to Date object
function parseHourToDate(hour: string): Date | null {
  // Check for week format (YYYY-WW)
  const weekMatch = hour.match(/^(\d{4})-(\d{2})$/);
  if (weekMatch) {
    const week = parseInt(weekMatch[2]);
    if (week > 12) {
      // Week format
      return getDateFromWeek(parseInt(weekMatch[1]), week);
    } else {
      // Month format (YYYY-MM)
      return new Date(parseInt(weekMatch[1]), parseInt(weekMatch[2]) - 1, 1);
    }
  }

  // Try parsing as regular datetime
  const date = new Date(hour);
  return isNaN(date.getTime()) ? null : date;
}

// Format date for tooltip based on hour format
function formatTooltipDate(hour: string): string {
  const date = parseHourToDate(hour);
  if (!date) return 'Time unavailable';

  // Check format type
  const weekMatch = hour.match(/^(\d{4})-(\d{2})$/);
  if (weekMatch) {
    const num = parseInt(weekMatch[2]);
    if (num > 12) {
      // Week format: YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else {
      // Month format: YYYY-MM
      return hour;
    }
  }

  // Regular datetime format - check if it has time component
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // Check if hour string contains time (has 'T' or space with time)
  if (hour.includes('T') || /\d{2}:\d{2}/.test(hour)) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } else {
    // Date only
    return `${year}-${month}-${day}`;
  }
}

// Format hour for X-axis based on selected timeRange
function formatHour(hour: string, timeRange?: string): string {
  const date = parseHourToDate(hour);
  if (!date) return hour;

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  // Simple: use timeRange directly to determine format
  if (timeRange === '1h' || timeRange === '24h') {
    return `${hours}:${minutes}`;  // Time only
  } else if (timeRange === '7d') {
    return `${month}-${day} ${hours}:${minutes}`;  // Date + Time
  } else {
    return `${month}-${day}`;  // Date only (30d, 3m, 6m, 1y, all)
  }
}

export function VolumeChart({
  data,
  height = 300,
  showGrid = true,
  gradient = true,
  tokenSymbol,
  timeRange,
}: VolumeChartProps) {
  // Transform data for chart display
  const chartData = data.map((item, index) => {
    const decimals = getTokenDecimals(item.tokenSymbol || 'MSQ');
    return {
      ...item,
      timestamp: item.timestamp || item.datetime, // Ensure timestamp field exists
      volumeDisplay: parseFloat(item.totalVolume) / Math.pow(10, decimals),
      hourLabel: formatHour(item.datetime, timeRange),
      uniqueKey: `${item.datetime}-${index}`, // 고유 키 추가
    };
  });

  // Calculate appropriate interval based on data length
  const getXAxisInterval = (dataLength: number) => {
    if (dataLength <= 24) return 'preserveStartEnd'; // 1h, 24h: show all or start/end
    if (dataLength <= 30) return 2; // 6m (26 weeks): show ~13 points
    if (dataLength <= 48) return 'preserveEnd'; // 2d: show end points
    if (dataLength <= 52) return 4; // 1y (52 weeks): show ~13 points
    if (dataLength <= 90) return Math.floor(dataLength / 10); // 30d-3m: show ~10 points
    if (dataLength <= 168) return 24; // 7d: show daily (every 24 hours)
    return 'preserveStartEnd'; // All time or others: show start/end
  };

  const xAxisInterval = getXAxisInterval(chartData.length);

  return (
    <div className='w-full' style={{ height }}>
      <ResponsiveContainer width='100%' height='100%'>
        <ComposedChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 25,
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
            dataKey='datetime'
            tickFormatter={(datetime) => formatHour(datetime, timeRange)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            interval={xAxisInterval}
          />

          {/* Left Y-axis for Volume */}
          <YAxis
            yAxisId='volume'
            orientation='left'
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            tickFormatter={value => {
              const decimals = getTokenDecimals(tokenSymbol || 'MSQ');
              return formatVolumeHelper(
                (value * Math.pow(10, decimals)).toString(),
                tokenSymbol
              );
            }}
          />

          {/* Right Y-axis for Transaction Count */}
          <YAxis
            yAxisId='count'
            orientation='right'
            domain={[0, dataMax => Math.ceil(dataMax * 1.5)]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            tickFormatter={value => {
              if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}k`;
              }
              return value.toString();
            }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
            allowEscapeViewBox={{ x: false, y: false }}
            isAnimationActive={false}
          />

          <Legend
            verticalAlign='bottom'
            height={36}
            iconType='line'
            wrapperStyle={{
              paddingTop: '10px',
              fontSize: '12px',
            }}
          />

          <Area
            yAxisId='volume'
            type='monotone'
            dataKey='volumeDisplay'
            stroke='#8b5cf6'
            strokeWidth={2}
            fill={gradient ? 'url(#volumeGradient)' : '#8b5cf6'}
            fillOpacity={gradient ? 1 : 0.3}
            name='Volume'
            isAnimationActive={false}
            activeDot={{ r: 4, fill: '#8b5cf6' }}
          />

          <Line
            yAxisId='count'
            type='monotone'
            dataKey='transactionCount'
            stroke='rgba(34, 211, 238, 0.4)'
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: 'rgba(34, 211, 238, 0.6)' }}
            name='Transactions'
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
