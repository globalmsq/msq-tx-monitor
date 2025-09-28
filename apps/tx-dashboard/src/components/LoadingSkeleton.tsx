import { cn } from '../utils/cn';

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn('animate-pulse bg-white/10 rounded-lg', className)} />
  );
}

export function TransactionSkeleton() {
  return (
    <div className='glass-dark rounded-lg p-4 animate-pulse'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4 flex-1'>
          <div className='w-10 h-10 bg-white/10 rounded-lg' />
          <div className='flex-1'>
            <div className='flex items-center space-x-2 mb-2'>
              <LoadingSkeleton className='h-4 w-48' />
              <LoadingSkeleton className='h-4 w-16' />
            </div>
            <div className='flex items-center space-x-3'>
              <LoadingSkeleton className='h-3 w-32' />
              <LoadingSkeleton className='h-3 w-20' />
            </div>
          </div>
        </div>
        <div className='text-right'>
          <LoadingSkeleton className='h-5 w-24 mb-1' />
          <LoadingSkeleton className='h-3 w-16' />
        </div>
      </div>
    </div>
  );
}

export function InitialLoadingSkeleton() {
  return (
    <div className='space-y-4'>
      {Array.from({ length: 10 }, (_, index) => (
        <TransactionSkeleton key={index} />
      ))}
    </div>
  );
}

export function LoadMoreButton({
  onLoadMore,
  hasMore,
  isLoading,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}) {
  if (!hasMore) {
    return (
      <div className='text-center py-4'>
        <p className='text-white/60 text-sm'>No more transactions to load</p>
      </div>
    );
  }

  return (
    <div className='text-center py-4'>
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className={cn(
          'px-6 py-2 rounded-lg font-medium transition-all',
          isLoading
            ? 'bg-white/10 text-white/50 cursor-not-allowed'
            : 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 hover:text-primary-300'
        )}
      >
        {isLoading ? (
          <div className='flex items-center space-x-2'>
            <div className='w-4 h-4 border-2 border-white/20 border-t-primary-400 rounded-full animate-spin' />
            <span>Loading...</span>
          </div>
        ) : (
          'Load More Transactions'
        )}
      </button>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className='glass rounded-xl lg:rounded-2xl p-4 lg:p-6 animate-pulse'>
      <LoadingSkeleton className='h-4 w-24 mb-2' />
      <LoadingSkeleton className='h-8 w-16 mb-1' />
      <LoadingSkeleton className='h-3 w-20' />
    </div>
  );
}

export function InitialStatsLoadingSkeleton() {
  return (
    <div className='space-y-6'>
      {/* General Statistics */}
      <div className='grid grid-cols-2 gap-3 lg:gap-6'>
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      {/* Token Statistics */}
      <div>
        <LoadingSkeleton className='h-4 w-32 mb-3' />
        <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4'>
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
      </div>
    </div>
  );
}
