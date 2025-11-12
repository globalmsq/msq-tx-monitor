import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
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
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
          }}
        >
          Page Not Found
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          The page you are looking for does not exist.
        </p>

        <Link
          href='/'
          style={{
            display: 'block',
            width: '100%',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            fontWeight: '500',
          }}
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
