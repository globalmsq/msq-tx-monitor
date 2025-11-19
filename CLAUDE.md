# Claude Code Instructions - MSQ Transaction Monitor

## Project Overview

MSQ Transaction Monitor is a real-time blockchain transaction monitoring system built as an NX monorepo. The system tracks token transactions on the Polygon network for MSQ ecosystem tokens (MSQ, SUT, KWT, P2UC).

**Architecture**: NX Monorepo with 5 applications
**Primary Technology**: TypeScript, React 18, Next.js, NestJS, MySQL, Redis
**Data Sources**: The Graph Subgraph (primary), MySQL (analytics), Redis (cache)
**Blockchain**: Polygon Network via https://polygon-rpc.com
**Deployment**: Docker containerized with unified Dockerfile.packages

## Application Structure

### Core Applications

- **tx-dashboard-v2** (port 3001, route `/`): Next.js primary dashboard (in development)
- **tx-dashboard** (port 3000, route `/v1/`): React 18 legacy dashboard with real-time WebSocket updates
- **tx-api** (port 8000): NestJS REST/GraphQL API with Subgraph/Redis integration
- **chain-scanner** (port 8001): Node.js blockchain scanner with Web3.js and WebSocket server
- **tx-analyzer** (port 8002): Express.js analytics service (currently disabled, migrated to tx-api, may be reactivated)

### Shared Libraries

- **database**: Prisma client and database configuration
- **subgraph-client**: GraphQL client for The Graph Subgraph queries
- **tx-types**: TypeScript type definitions for transactions and addresses
- **chain-utils**: Blockchain utility functions (Web3 helpers, validators)
- **msq-common**: MSQ ecosystem common functions (formatters, logger, constants)

## Development Guidelines

### NX Workspace Commands

```bash
# Serve individual applications
pnpm nx serve tx-dashboard-v2  # Next.js dashboard
pnpm nx serve tx-dashboard     # React dashboard (legacy)
pnpm nx serve tx-api           # NestJS API
pnpm nx serve chain-scanner    # Blockchain scanner

# Build and test
pnpm run build                 # Build all packages
pnpm run test                  # Test all packages
pnpm run lint                  # Lint all packages
```

### Docker Development

```bash
# Development with hot reload
pnpm run docker:dev

# Production deployment
pnpm run docker:prod

# Stop all services
pnpm run docker:down
```

### Environment Configuration

Each application maintains independent .env files:

- No global environment variables
- Docker services use service names for internal communication
- Polygon RPC endpoint: https://polygon-rpc.com (configurable with backups)
- Subgraph endpoint: https://api.studio.thegraph.com/query/1704765/msq-tokens-subgraph/version/latest

### Database Schema (MySQL/Prisma)

- **tokens**: Token metadata (MSQ, SUT, KWT, P2UC)
- **transactions**: Blockchain transaction data
- **address_statistics**: Real-time address analytics and risk profiling
- **anomalies**: Detected suspicious transaction patterns
- **system_statistics**: Aggregated system-wide metrics
- **block_processing_status**: Block sync tracking
- **sync_status**: Historical/realtime/statistics sync state

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**

@./.taskmaster/CLAUDE.md
@./.claude/CLAUDE.mdc
@./.project-rules/add-to-changelog.mdc
@./.project-rules/analyze-jira-issue.mdc
@./.project-rules/check.mdc
@./.project-rules/clean.mdc
@./.project-rules/code-analysis.mdc
@./.project-rules/commit.mdc
@./.project-rules/context-prime.mdc
@./.project-rules/continuous-improvement.mdc
@./.project-rules/create-command.mdc
@./.project-rules/create-docs.mdc
@./.project-rules/five.mdc
@./.project-rules/implement-task.mdc
@./.project-rules/mcp-inspector-debugging.mdc
@./.project-rules/mermaid.mdc
@./.project-rules/pr-review.mdc
@./.project-rules/update-docs.mdc

## Project-Specific Development Rules

### Blockchain Development

- Always validate addresses before processing
- Use Web3.js/Ethers.js for blockchain interactions
- Implement RPC provider failover logic
- Handle blockchain reorgs gracefully
- Log all RPC calls for debugging

### Real-time Systems

- WebSocket connections must handle reconnection
- Implement exponential backoff for retries
- Use Redis for caching frequently accessed data
- Design for horizontal scaling

### Security Considerations

- Never log private keys or sensitive data
- Validate all transaction data before storage
- Implement rate limiting on all public endpoints
- Use parameterized queries to prevent SQL injection

### Performance Requirements

- Transaction processing latency < 10 seconds
- API response times < 1 second (cached data)
- WebSocket message broadcasting < 100ms
- Database queries optimized with proper indexing

### Code Organization

- Follow NX project structure conventions
- Keep shared code in libs/ directory
- Use TypeScript strict mode for all Node.js code
- Implement comprehensive error handling
