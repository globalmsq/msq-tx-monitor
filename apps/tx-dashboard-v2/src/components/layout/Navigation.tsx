'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface NavLinkProps {
  href: string;
  children: ReactNode;
}

function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium ${
        isActive
          ? 'bg-primary-600 text-white'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </Link>
  );
}

export function Navigation() {
  return (
    <nav className='flex space-x-4'>
      <NavLink href='/'>Home</NavLink>
      <NavLink href='/addresses'>Addresses</NavLink>
      <NavLink href='/analytics'>Analytics</NavLink>
    </nav>
  );
}
