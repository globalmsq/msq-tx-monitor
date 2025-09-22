# Claude Code Instructions - MSQ Transaction Monitor

## Project Overview

MSQ Transaction Monitor is a real-time blockchain transaction monitoring system built as an NX monorepo. The system tracks token transactions on the Polygon network for MSQ ecosystem tokens (MSQ, SUT, KWT, P2UC).

**Architecture**: NX Monorepo with 4 microservices
**Primary Technology**: TypeScript, React 18, Express.js, Python, MySQL, Redis
**Blockchain**: Polygon Network via https://polygon-rpc.com
**Deployment**: Docker containerized with unified Dockerfile.packages

## Application Structure

### Core Applications

- **tx-dashboard** (port 3000): React 18 dashboard with real-time WebSocket updates
- **tx-api** (port 8000): Express.js REST API with MySQL/Redis integration
- **chain-scanner** (port 8001): Node.js blockchain scanner with Web3.js
- **tx-analyzer** (port 8002): Python FastAPI analytics with ML anomaly detection

### Shared Libraries

- **tx-types**: TypeScript type definitions for transactions and addresses
- **chain-utils**: Blockchain utility functions (Web3 helpers, validators)
- **msq-common**: MSQ ecosystem common functions (risk scoring, whale detection)

## Development Guidelines

### NX Workspace Commands

```bash
# Serve individual applications
nx serve tx-dashboard    # React dashboard
nx serve tx-api         # Express API
nx serve chain-scanner  # Blockchain scanner
nx serve tx-analyzer    # Python analytics

# Build and test
nx build-all
nx test-all
nx run-many --target=lint --all
```

### Docker Development

```bash
# Development with hot reload
npm run docker:dev

# Production build and deploy
npm run docker:build
npm run docker:up
```

### Environment Configuration

Each application maintains independent .env files:

- No global environment variables
- Docker services use service names for internal communication
- Polygon RPC endpoint: https://polygon-rpc.com (configurable with backups)

### Database Schema Focus

- **transactions**: Blockchain transaction data with anomaly scoring
- **address_statistics**: Real-time address analytics and risk profiling
- **anomalies**: ML-detected suspicious transaction patterns

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
