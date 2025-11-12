'use client';

import { useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#f9fafb',
      }}
    >
      <div
        style={{
          maxWidth: '28rem',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
          }}
        >
          Something went wrong!
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          {error.message ||
            'An unexpected error occurred while loading the dashboard.'}
        </p>

        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <button
            onClick={reset}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
            }}
          >
            Go to Homepage
          </button>
        </div>

        {error.digest && (
          <p
            style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}
          >
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
