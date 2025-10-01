import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatVolume } from '@msq-tx-monitor/msq-common';

interface TrendPoint {
  timestamp: string;
  transactionCount: number;
  volume: string;
  sentCount: number;
  receivedCount: number;
  sentVolume: string;
  receivedVolume: string;
  avgAnomalyScore: number;
}

interface TrendChartProps {
  data: TrendPoint[];
  tokenSymbol?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  tokenSymbol = 'MSQ',
}) => {
  // Transform data for chart
  const chartData = data.map(point => ({
    time: new Date(point.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    }),
    transactions: point.transactionCount,
    volume: parseFloat(
      formatVolume(point.volume, tokenSymbol).replace(/,/g, '')
    ),
    sent: point.sentCount,
    received: point.receivedCount,
    anomalyScore: point.avgAnomalyScore,
  }));

  return (
    <div className='space-y-6'>
      {/* Transaction Count and Volume Chart */}
      <div className='bg-gray-800/50 rounded-lg p-4'>
        <h3 className='text-sm font-medium text-white/80 mb-4'>
          Transaction Activity
        </h3>
        <ResponsiveContainer width='100%' height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray='3 3' stroke='#374151' />
            <XAxis
              dataKey='time'
              stroke='#9CA3AF'
              fontSize={12}
              angle={-45}
              textAnchor='end'
              height={80}
            />
            <YAxis
              yAxisId='left'
              stroke='#3B82F6'
              fontSize={12}
              label={{
                value: 'Transactions',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#3B82F6' },
              }}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              stroke='#10B981'
              fontSize={12}
              label={{
                value: `Volume (${tokenSymbol})`,
                angle: 90,
                position: 'insideRight',
                style: { fill: '#10B981' },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#fff',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'volume') {
                  return [value.toLocaleString(), 'Volume'];
                }
                return [value, name === 'transactions' ? 'Transactions' : name];
              }}
            />
            <Legend />
            <Line
              yAxisId='left'
              type='monotone'
              dataKey='transactions'
              stroke='#3B82F6'
              strokeWidth={2}
              dot={false}
              name='Transactions'
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='volume'
              stroke='#10B981'
              strokeWidth={2}
              dot={false}
              name='Volume'
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sent vs Received Chart */}
      <div className='bg-gray-800/50 rounded-lg p-4'>
        <h3 className='text-sm font-medium text-white/80 mb-4'>
          Sent vs Received
        </h3>
        <ResponsiveContainer width='100%' height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray='3 3' stroke='#374151' />
            <XAxis
              dataKey='time'
              stroke='#9CA3AF'
              fontSize={12}
              angle={-45}
              textAnchor='end'
              height={80}
            />
            <YAxis stroke='#9CA3AF' fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#fff',
              }}
            />
            <Legend />
            <Bar dataKey='sent' fill='#EF4444' name='Sent' />
            <Bar dataKey='received' fill='#3B82F6' name='Received' />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Anomaly Score Trend */}
      {chartData.some(d => d.anomalyScore > 0) && (
        <div className='bg-gray-800/50 rounded-lg p-4'>
          <h3 className='text-sm font-medium text-white/80 mb-4'>
            Risk Score Trend
          </h3>
          <ResponsiveContainer width='100%' height={150}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' stroke='#374151' />
              <XAxis
                dataKey='time'
                stroke='#9CA3AF'
                fontSize={12}
                angle={-45}
                textAnchor='end'
                height={80}
              />
              <YAxis
                stroke='#9CA3AF'
                fontSize={12}
                domain={[0, 1]}
                tickFormatter={value => value.toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#fff',
                }}
                formatter={(value: any) => [value.toFixed(3), 'Avg Risk Score']}
              />
              <Line
                type='monotone'
                dataKey='anomalyScore'
                stroke='#F59E0B'
                strokeWidth={2}
                dot={false}
                name='Risk Score'
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
