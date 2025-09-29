import React, { Suspense } from 'react';
import { RefreshCw } from 'lucide-react';
import type { VolumeChartProps } from './VolumeChart';
import type { TokenDistributionChartProps } from './TokenDistributionChart';
import type { AddressActivityChartProps } from './AddressActivityChart';
import type { AnomalyChartProps } from './AnomalyChart';
import type { TransactionChartProps } from './TransactionChart';

// Lazy load chart components for better performance
const VolumeChart = React.lazy(() =>
  import('./VolumeChart').then(module => ({ default: module.VolumeChart }))
);

const TokenDistributionChart = React.lazy(() =>
  import('./TokenDistributionChart').then(module => ({
    default: module.TokenDistributionChart,
  }))
);

const AddressActivityChart = React.lazy(() =>
  import('./AddressActivityChart').then(module => ({
    default: module.AddressActivityChart,
  }))
);

const AnomalyChart = React.lazy(() =>
  import('./AnomalyChart').then(module => ({ default: module.AnomalyChart }))
);

const TransactionChart = React.lazy(() =>
  import('./TransactionChart').then(module => ({
    default: module.TransactionChart,
  }))
);

// Loading fallback component
const ChartLoader = ({ height = 300 }: { height?: number }) => (
  <div className='w-full flex items-center justify-center' style={{ height }}>
    <div className='flex items-center gap-3 text-white/60'>
      <RefreshCw className='w-5 h-5 animate-spin' />
      <span>Loading chart...</span>
    </div>
  </div>
);

// Wrapper components with Suspense
export const LazyVolumeChart = React.memo((props: VolumeChartProps) => (
  <Suspense fallback={<ChartLoader height={props.height} />}>
    <VolumeChart {...props} />
  </Suspense>
));

export const LazyTokenDistributionChart = React.memo((props: TokenDistributionChartProps) => (
  <Suspense fallback={<ChartLoader height={props.height} />}>
    <TokenDistributionChart {...props} />
  </Suspense>
));

export const LazyAddressActivityChart = React.memo((props: AddressActivityChartProps) => (
  <Suspense fallback={<ChartLoader height={props.height} />}>
    <AddressActivityChart {...props} />
  </Suspense>
));

export const LazyAnomalyChart = React.memo((props: AnomalyChartProps) => (
  <Suspense fallback={<ChartLoader height={props.height} />}>
    <AnomalyChart {...props} />
  </Suspense>
));

export const LazyTransactionChart = React.memo((props: TransactionChartProps) => (
  <Suspense fallback={<ChartLoader height={props.height} />}>
    <TransactionChart {...props} />
  </Suspense>
));

LazyVolumeChart.displayName = 'LazyVolumeChart';
LazyTokenDistributionChart.displayName = 'LazyTokenDistributionChart';
LazyAddressActivityChart.displayName = 'LazyAddressActivityChart';
LazyAnomalyChart.displayName = 'LazyAnomalyChart';
LazyTransactionChart.displayName = 'LazyTransactionChart';
