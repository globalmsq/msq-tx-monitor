import Link from 'next/link';
import { Suspense } from 'react';
import { TokenStatistics } from './_components/TokenStatistics';
import { TransactionList } from './_components/TransactionList';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Header } from '@/components/layout/Header';

export const dynamic = 'force-dynamic'; // Disable static generation for now
export const revalidate = 60; // Revalidate every 60 seconds

export default function Home() {
  return (
    <>
      <Header />
      <main className='min-h-screen p-8 bg-gray-50 dark:bg-gray-900'>
        <div className='max-w-7xl mx-auto'>
          <h1 className='text-4xl font-bold mb-2 text-center'>
            MSQ Transaction Monitor v2
          </h1>
          <p className='text-center text-gray-600 dark:text-gray-400 mb-8'>
            Real-time blockchain monitoring powered by The Graph Subgraph
          </p>

          {/* Token Statistics */}
          <section className='mb-12'>
            <Suspense
              fallback={
                <div className='text-center py-12'>
                  <LoadingSpinner />
                  <p className='mt-4 text-gray-600 dark:text-gray-400'>
                    Loading token statistics...
                  </p>
                </div>
              }
            >
              <TokenStatistics />
            </Suspense>
          </section>

          {/* Recent Transactions */}
          <section className='mb-12'>
            <Suspense
              fallback={
                <div className='text-center py-12'>
                  <LoadingSpinner />
                  <p className='mt-4 text-gray-600 dark:text-gray-400'>
                    Loading recent transactions...
                  </p>
                </div>
              }
            >
              <TransactionList />
            </Suspense>
          </section>

          {/* Navigation Cards */}
          <section>
            <h2 className='text-2xl font-bold mb-4'>Explore More</h2>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Link
                href='/'
                className='card hover:shadow-lg transition-shadow cursor-pointer'
              >
                <h3 className='text-xl font-semibold mb-2'>🔴 Live Feed</h3>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>
                  Real-time transaction updates
                </p>
              </Link>

              <Link
                href='/addresses'
                className='card hover:shadow-lg transition-shadow cursor-pointer'
              >
                <h3 className='text-xl font-semibold mb-2'>📊 Addresses</h3>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>
                  Browse address statistics
                </p>
              </Link>

              <Link
                href='/analytics'
                className='card hover:shadow-lg transition-shadow cursor-pointer'
              >
                <h3 className='text-xl font-semibold mb-2'>📈 Analytics</h3>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>
                  Token trends and insights
                </p>
              </Link>
            </div>
          </section>

          <div className='mt-8 text-center text-sm text-gray-500 dark:text-gray-400'>
            <p>Next.js 14 • Server Components • The Graph Subgraph</p>
            <p className='mt-1'>Data updates every 60 seconds</p>
          </div>
        </div>
      </main>
    </>
  );
}
