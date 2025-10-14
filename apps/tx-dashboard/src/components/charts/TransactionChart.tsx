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

interface TransactionDataPoint {
  timestamp: string;
  hour: string;
  totalVolume: string;
  transactionCount: number;
  averageVolume: string;
  tokenSymbol?: string;
}

export interface TransactionChartProps {
  data: TransactionDataPoint[];
  height?: number;
  showGrid?: boolean;
  tokenSymbol?: string;
}

// Custom tooltip component for transactions
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TransactionDataPoint;
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TransactionDataPoint;

    // Format date for tooltip
    const dateStr = data.timestamp || data.hour;
    const formattedDate = formatTooltipDate(dateStr);

    return (
      <div className='bg-gray-900/95 backdrop-blur border border-white/20 rounded-lg p-3 shadow-xl'>
        <p className='text-white font-medium mb-2'>{formattedDate}</p>
        <div className='space-y-1'>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-sm' style={{ color: '#06b6d4' }}>
              Transactions:
            </span>
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

// Format hour for X-axis based on data length and format type
function formatHour(hour: string, dataLength: number): string {
  const date = parseHourToDate(hour);
  if (!date) return hour;

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

  // Regular datetime format
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (dataLength <= 24) {
    // 1h, 24h: HH:MM
    return `${hours}:${minutes}`;
  } else if (dataLength <= 168) {
    // 7d: MM-DD HH:MM, 30d+: MM-DD only
    if (dataLength <= 48) {
      return `${month}-${day} ${hours}:${minutes}`;
    } else {
      return `${month}-${day}`;
    }
  } else {
    // Other ranges: MM-DD
    return `${month}-${day}`;
  }
}

export function TransactionChart({
  data,
  height = 300,
  showGrid = true,
  tokenSymbol: _tokenSymbol,
}: TransactionChartProps) {
  // Transform data for chart display
  const chartData = data.map((item, index) => {
    return {
      ...item,
      timestamp: item.timestamp || item.hour, // Ensure timestamp field exists
      hourLabel: formatHour(item.hour, data.length),
      uniqueKey: `${item.hour}-${index}`, // 고유 키 추가
    };
  });

  // Calculate appropriate interval based on data length
  const getXAxisInterval = (dataLength: number) => {
    if (dataLength <= 24) return 'preserveStartEnd'; // 1h, 24h: show all or start/end
    if (dataLength <= 30) return Math.floor(dataLength / 8); // 30d: ~8 labels
    if (dataLength <= 52) return Math.floor(dataLength / 8); // 6m, 1y: ~6-8 labels
    if (dataLength <= 90) return Math.floor(dataLength / 8); // 3m: ~11 labels
    if (dataLength <= 168) return Math.floor(dataLength / 8); // 7d: ~21 labels
    return 'preserveStartEnd'; // All time or others: show start/end
  };

  const xAxisInterval = getXAxisInterval(chartData.length);

  return (
    <div className='w-full' style={{ height }}>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={chartData}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 30, // Increased to prevent x-axis label truncation
          }}
          barCategoryGap={2}
        >
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
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
            interval={xAxisInterval}
            angle={-45}
            textAnchor='end'
            height={70}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            tickFormatter={value => value.toLocaleString()}
            domain={[0, dataMax => Math.ceil(dataMax * 1.15)]}
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey='transactionCount' fill='#06b6d4' name='Transactions' />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
