# MSQ Transaction Monitor v2 - Next.js 14 Dashboard

Real-time blockchain transaction monitoring dashboard built with Next.js 14 App Router and The Graph Subgraph.

## Features

- **Server Components**: Token statistics and transaction list with server-side data fetching
- **Subgraph Integration**: Real-time data from The Graph for MSQ ecosystem tokens (MSQ, KWT, SUT, P2UC)
- **Modern UI**: Tailwind CSS with dark mode support
- **Performance**: Optimized with Suspense boundaries and incremental static regeneration

## Tech Stack

- Next.js 14.2.33 (App Router)
- React 18.3.1
- TypeScript (strict mode, ES2020)
- Tailwind CSS
- The Graph Subgraph Client
- NX Monorepo

## Development

### Start Development Server

```bash
# From project root
pnpm nx serve tx-dashboard-v2

# Or directly from app directory
cd apps/tx-dashboard-v2
pnpm next dev
```

The application will be available at http://localhost:3000

### Build for Production

**Note**: Production builds currently have an issue with Next.js auto-generating error pages (`/404`, `/500`) using Pages Router patterns. This is a known compatibility issue between Next.js 14.2.33 and NX monorepo setup.

For now, use development mode for testing and development. Production build will be resolved with future Next.js updates.

```bash
# This will fail with static page generation errors
pnpm nx build tx-dashboard-v2
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/xxxxx/msq-tokens-subgraph/version/latest
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home page (Server Component)
│   ├── layout.tsx            # Root layout
│   ├── loading.tsx           # Loading UI
│   ├── error.tsx             # Error boundary
│   ├── not-found.tsx         # 404 page
│   ├── global-error.tsx      # Global error handler
│   ├── _components/          # Page-specific components
│   │   ├── TokenStatistics.tsx
│   │   └── TransactionList.tsx
│   ├── addresses/
│   │   └── page.tsx
│   └── analytics/
│       └── page.tsx
├── components/
│   ├── ui/                   # Reusable UI components
│   └── layout/               # Layout components
├── lib/
│   └── subgraph.ts           # Subgraph client utilities
└── styles/
    └── globals.css           # Global styles
```

## Key Implementation Details

### Server Components

- **TokenStatistics**: Fetches and displays token statistics (total supply, holder count) from Subgraph
- **TransactionList**: Shows recent 20 transactions with real-time data

### Data Fetching

```typescript
// Server-side data fetching with revalidation
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = 'force-dynamic'; // Disable static generation

// Example component
export async function TokenStatistics() {
  const tokens = await fetchTokenStatistics();
  // Render tokens...
}
```

### Type Safety

All GraphQL query results are properly typed using generated types from `@msq-tx-monitor/subgraph-client`:

```typescript
import type { GetTokensQuery, GetTransfersQuery } from '@msq-tx-monitor/subgraph-client';

type TokenData = GetTokensQuery['tokens'][number];
type TransferData = GetTransfersQuery['transfers'][number];
```

### BigInt Handling

The project uses ES2020 target to support BigInt literals:

```typescript
const amount = 1000000000000000000n; // BigInt literal
const formatted = formatTokenAmount(amount, 18); // "1.0"
```

## Known Issues

### Production Build Error

**Issue**: Next.js 14.2.33 auto-generates `/_error` pages for `/404` and `/500` using Pages Router patterns, which conflicts with App Router.

**Error Message**:
```
Error: <Html> should not be imported outside of pages/_document
Error occurred prerendering page "/404"
Error occurred prerendering page "/500"
```

**Status**: Development mode works perfectly. Production build issue will be addressed in future Next.js updates or by upgrading to Next.js 15.

**Workaround**: Use development mode for now:
```bash
pnpm nx serve tx-dashboard-v2
```

## Next Steps

### Subtask 27.13: Client Components (Upcoming)

- [ ] RealTimeTransactionFeed with WebSocket connection
- [ ] LiveStatisticsPanel with live updates
- [ ] Custom hooks (useTransactions, useWebSocket, useTokenStats)
- [ ] Optimistic UI updates

### Subtask 27.14: Chart.js Visualization (Upcoming)

- [ ] TransactionVolumeChart
- [ ] TokenDistributionPie
- [ ] AnomalyTimeline
- [ ] Dynamic imports for bundle optimization

## Contributing

When adding new features:
1. Keep Server Components for initial data fetching
2. Use Client Components only when interactivity is needed
3. Properly type all Subgraph data using query result types
4. Follow existing patterns for consistency
5. Add appropriate loading and error states

## License

Private project - MSQ Transaction Monitor
