import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';

interface AnomalyDataPoint {
  timestamp: string;
  hour: string;
  anomalyCount: number;
  averageScore: number;
  highRiskCount: number;
  totalTransactions: number;
  anomalyRate: number; // percentage
}

export interface AnomalyChartProps {
  data: AnomalyDataPoint[];
  height?: number;
  showGrid?: boolean;
  riskThreshold?: number;
}

// Custom tooltip component
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: AnomalyDataPoint;
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AnomalyDataPoint;

    return (
      <div className='bg-gray-900/95 backdrop-blur border border-white/20 rounded-lg p-3 shadow-xl'>
        <p className='text-white font-medium mb-2'>
          {new Date(data.timestamp).toLocaleString()}
        </p>
        <div className='space-y-1'>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-red-400 text-sm'>Anomalies:</span>
            <span className='text-white font-bold'>{data.anomalyCount}</span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-yellow-400 text-sm'>Risk Score:</span>
            <span className='text-white'>
              {(data.averageScore * 100).toFixed(1)}%
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-orange-400 text-sm'>High Risk:</span>
            <span className='text-white'>{data.highRiskCount}</span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-blue-400 text-sm'>Total Txs:</span>
            <span className='text-white'>
              {data.totalTransactions.toLocaleString()}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-purple-400 text-sm'>Anomaly Rate:</span>
            <span className='text-white'>{data.anomalyRate.toFixed(2)}%</span>
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
  }>;
}

function CustomLegend({ payload }: LegendProps) {
  const iconMap: Record<string, React.ReactNode> = {
    'Anomaly Count': <AlertTriangle className='w-4 h-4' />,
    'Risk Score': <Shield className='w-4 h-4' />,
    'Anomaly Rate': <TrendingUp className='w-4 h-4' />,
  };

  if (!payload) return null;

  return (
    <div className='flex flex-wrap justify-center gap-6 mt-4'>
      {payload.map((entry, index) => (
        <div key={index} className='flex items-center gap-2'>
          <div style={{ color: entry.color }}>
            {iconMap[entry.value] || (
              <div
                className='w-4 h-4 rounded-full'
                style={{ backgroundColor: entry.color }}
              />
            )}
          </div>
          <span className='text-white/80 text-sm font-medium'>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
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

export function AnomalyChart({
  data,
  height = 350,
  showGrid = true,
  riskThreshold = 0.7,
}: AnomalyChartProps) {
  // Transform data for chart display
  const chartData = data.map(item => ({
    ...item,
    hourLabel: formatHour(item.hour),
    riskPercentage: item.averageScore * 100,
  }));

  // Get risk level color
  const getRiskColor = (score: number): string => {
    if (score >= riskThreshold * 100) return '#ef4444'; // red
    if (score >= riskThreshold * 0.7 * 100) return '#f59e0b'; // amber
    return '#10b981'; // green
  };

  // Calculate statistics
  const totalAnomalies = data.reduce((sum, item) => sum + item.anomalyCount, 0);
  const avgRiskScore =
    data.reduce((sum, item) => sum + item.averageScore, 0) / data.length;
  const maxAnomalies = Math.max(...data.map(item => item.anomalyCount));

  return (
    <div className='w-full space-y-4'>
      {/* Summary Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        <div className='bg-white/5 rounded-lg p-3'>
          <div className='flex items-center gap-2 mb-1'>
            <AlertTriangle className='w-4 h-4 text-red-400' />
            <span className='text-white/60 text-sm'>Total Anomalies</span>
          </div>
          <div className='text-white font-bold text-lg'>{totalAnomalies}</div>
        </div>

        <div className='bg-white/5 rounded-lg p-3'>
          <div className='flex items-center gap-2 mb-1'>
            <Shield className='w-4 h-4 text-yellow-400' />
            <span className='text-white/60 text-sm'>Avg Risk Score</span>
          </div>
          <div className='text-white font-bold text-lg'>
            {(avgRiskScore * 100).toFixed(1)}%
          </div>
        </div>

        <div className='bg-white/5 rounded-lg p-3'>
          <div className='flex items-center gap-2 mb-1'>
            <TrendingUp className='w-4 h-4 text-orange-400' />
            <span className='text-white/60 text-sm'>Peak Anomalies</span>
          </div>
          <div className='text-white font-bold text-lg'>{maxAnomalies}</div>
        </div>

        <div className='bg-white/5 rounded-lg p-3'>
          <div className='flex items-center gap-2 mb-1'>
            <div
              className='w-4 h-4 rounded-full'
              style={{ backgroundColor: getRiskColor(avgRiskScore * 100) }}
            />
            <span className='text-white/60 text-sm'>Risk Level</span>
          </div>
          <div className='text-white font-bold text-lg'>
            {avgRiskScore >= riskThreshold
              ? 'High'
              : avgRiskScore >= riskThreshold * 0.7
                ? 'Medium'
                : 'Low'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className='w-full' style={{ height }}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart
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
              dataKey='hourLabel'
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
              interval='preserveStartEnd'
            />

            <YAxis
              yAxisId='left'
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            />

            <YAxis
              yAxisId='right'
              orientation='right'
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
              domain={[0, 100]}
              tickFormatter={value => `${value}%`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend content={<CustomLegend />} />

            {/* Risk threshold line */}
            <ReferenceLine
              yAxisId='right'
              y={riskThreshold * 100}
              stroke='#ef4444'
              strokeDasharray='5 5'
              strokeOpacity={0.8}
              label={{
                value: 'Risk Threshold',
                position: 'top',
                fill: '#ef4444',
                fontSize: 12,
              }}
            />

            {/* Anomaly count bars */}
            <Bar
              yAxisId='left'
              dataKey='anomalyCount'
              fill='url(#anomalyGradient)'
              radius={[2, 2, 0, 0]}
              name='Anomaly Count'
            />

            {/* Risk score line */}
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='riskPercentage'
              stroke='#f59e0b'
              strokeWidth={3}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#f59e0b' }}
              name='Risk Score'
            />

            {/* Anomaly rate line */}
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='anomalyRate'
              stroke='#8b5cf6'
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 1, r: 3 }}
              strokeDasharray='3 3'
              name='Anomaly Rate'
            />

            {/* Gradient definitions */}
            <defs>
              <linearGradient id='anomalyGradient' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='#ef4444' stopOpacity={0.8} />
                <stop offset='95%' stopColor='#ef4444' stopOpacity={0.2} />
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Assessment */}
      <div className='bg-white/5 rounded-lg p-4'>
        <h4 className='text-white font-medium mb-3 flex items-center gap-2'>
          <Shield className='w-4 h-4' />
          Risk Assessment
        </h4>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-white/70 text-sm'>Current Risk Level:</span>
            <div className='flex items-center gap-2'>
              <div
                className='w-3 h-3 rounded-full'
                style={{ backgroundColor: getRiskColor(avgRiskScore * 100) }}
              />
              <span className='text-white font-medium'>
                {avgRiskScore >= riskThreshold
                  ? 'High Risk'
                  : avgRiskScore >= riskThreshold * 0.7
                    ? 'Medium Risk'
                    : 'Low Risk'}
              </span>
            </div>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-white/70 text-sm'>Recommendation:</span>
            <span className='text-white text-sm'>
              {avgRiskScore >= riskThreshold
                ? 'Immediate Review Required'
                : avgRiskScore >= riskThreshold * 0.7
                  ? 'Monitor Closely'
                  : 'Normal Monitoring'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
