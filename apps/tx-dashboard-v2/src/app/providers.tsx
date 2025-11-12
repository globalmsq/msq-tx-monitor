'use client';

import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Simplified providers - React Query will be added later for client components
  return <>{children}</>;
}
