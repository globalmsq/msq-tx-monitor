'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Live Transactions' },
    { href: '/addresses', label: 'Addresses' },
    { href: '/analytics', label: 'Analytics' },
  ];

  return (
    <header className='bg-white dark:bg-gray-800 shadow'>
      <nav className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          <div className='flex'>
            <Link href='/' className='flex items-center'>
              <span className='text-xl font-bold text-primary-600'>
                MSQ Monitor v2
              </span>
            </Link>
            <div className='hidden sm:ml-6 sm:flex sm:space-x-8'>
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === link.href
                      ? 'border-primary-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
