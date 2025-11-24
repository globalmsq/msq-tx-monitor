import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <div className='text-center'>
        <LoadingSpinner />
        <p className='mt-4 text-gray-600 dark:text-gray-400'>
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
