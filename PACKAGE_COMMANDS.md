# Package Commands Guide

This document explains how to run commands for individual apps and all apps together in the MSQ Transaction Monitor monorepo.

## Individual App Commands

Each app has its own `package.json` with individual scripts. You can run commands in two ways:

### Method 1: Navigate to app directory

```bash
# Navigate to specific app
cd apps/tx-api
pnpm dev        # Start development server
pnpm build      # Build ONLY this app (isolated)
pnpm build:nx   # Build using NX (includes dependencies)
pnpm test       # Run tests for this app only
pnpm lint       # Lint this app only
pnpm typecheck  # Type check this app only
```

### Method 2: Use filter from root directory

```bash
# From root directory using pnpm filter
pnpm api dev        # Start tx-api development server
pnpm api build      # Build tx-api
pnpm api test       # Run tx-api tests
pnpm api lint       # Lint tx-api
pnpm api typecheck  # Type check tx-api

# Same pattern for other apps
pnpm dashboard dev
pnpm scanner build
pnpm analyzer test
```

## Available Apps

| App               | Filter Command   | Description                            |
| ----------------- | ---------------- | -------------------------------------- |
| **tx-api**        | `pnpm api`       | Express.js REST API server             |
| **tx-dashboard**  | `pnpm dashboard` | React dashboard with real-time updates |
| **chain-scanner** | `pnpm scanner`   | Blockchain scanner service             |
| **tx-analyzer**   | `pnpm analyzer`  | Python FastAPI analytics service       |

## Bulk Commands

Run commands across multiple apps at once:

```bash
# All apps
pnpm apps:dev       # Start all apps in development mode
pnpm apps:build     # Build all apps
pnpm apps:test      # Test all apps
pnpm apps:lint      # Lint all apps

# Legacy NX commands (still available)
pnpm dev           # Start all apps with NX
pnpm build         # Build all with NX
pnpm test          # Test all with NX
pnpm lint          # Lint all with NX
```

## Docker Commands

```bash
pnpm docker:dev    # Start development containers
pnpm docker:prod   # Start production containers
pnpm docker:down   # Stop all containers
```

## Examples

```bash
# Start only the API server
pnpm api dev

# Build only the dashboard
pnpm dashboard build

# Run tests for the scanner
cd apps/chain-scanner
pnpm test

# Start all apps for development
pnpm apps:dev

# Build and test the API
pnpm api build && pnpm api test
```

## Individual vs NX Commands

Each app now has two sets of commands:

### Isolated Commands (App-Only)

- `build` - Build only this specific app, no dependencies
  - ✅ **tx-api**: TypeScript compilation to `../../dist/apps/tx-api`
  - ✅ **chain-scanner**: TypeScript compilation to `../../dist/apps/chain-scanner`
  - ⚠️ **tx-dashboard**: Requires NX build (displays message to use `build:nx`)
  - ✅ **tx-analyzer**: Python compilation check
- `test` - Run tests for only this app (bypasses NX)
- `lint` - Lint only this app's source code (bypasses NX)
- `typecheck` - Type check only this app (bypasses NX)

### NX Commands (With Dependencies)

- `build:nx` - Build using NX dependency graph (includes dependencies)
- `test:nx` - Run tests using NX orchestration
- `lint:nx` - Lint using NX configuration
- Use these when you need full dependency resolution and shared library builds

## App-Specific Scripts

Each app has additional scripts in their `package.json` files:

- **tx-api**: `start`, `test:watch`, `test:coverage`
- **tx-dashboard**: `preview`, `test:ui`, `test:coverage`
- **chain-scanner**: `start`, `test:watch`, `test:coverage`
- **tx-analyzer**: `start`, `test:coverage`, `lint:fix`
