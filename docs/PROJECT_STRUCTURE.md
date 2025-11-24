# MSQ Transaction Monitor - Project Structure

## 🏗️ Architecture Overview

MSQ Transaction Monitor is built as an NX monorepo with 4 independent microservices, each serving a specific purpose in the blockchain monitoring ecosystem.

## 📁 Directory Structure

```
msq-tx-monitor/
├── apps/                     # Applications
│   ├── tx-dashboard/        # React 18 + TypeScript Dashboard
│   │   ├── project.json    # NX project configuration
│   │   ├── .env.example    # Environment variables template
│   │   ├── src/
│   │   │   ├── app/        # React app components
│   │   │   ├── assets/     # Static assets
│   │   │   └── environments/ # Environment configs
│   │   ├── tsconfig.json   # TypeScript config
│   │   └── webpack.config.js
│   │
│   ├── tx-api/             # NestJS (GraphQL) API Server
│   │   ├── project.json
│   │   ├── .env.example
│   │   ├── src/
│   │   │   ├── app/        # Express app setup
│   │   │   ├── routes/     # API route handlers
│   │   │   ├── middleware/ # Express middleware
│   │   │   ├── models/     # Database models
│   │   │   ├── services/   # Business logic
│   │   │   └── utils/      # Utility functions
│   │   └── tsconfig.json
│   │
│   ├── chain-scanner/      # Blockchain Transaction Scanner
│   │   ├── project.json
│   │   ├── .env.example
│   │   ├── src/
│   │   │   ├── scanner/    # Main scanning logic
│   │   │   ├── processors/ # Transaction processors
│   │   │   ├── websocket/  # WebSocket server
│   │   │   ├── rpc/        # RPC provider management
│   │   │   └── storage/    # Database storage
│   │   └── tsconfig.json
│   │
│   └── tx-analyzer/        # (Temporarily Unused)
│
├── docker/                 # Docker Configuration
│   ├── docker-compose.yml     # Production compose
│   ├── docker-compose.dev.yml # Development compose
│   ├── Dockerfile.packages    # Multi-stage Dockerfile
│   ├── nginx.conf            # Nginx config for frontend
│   └── volumes/
│       └── mysql/
│           └── init.sql      # Database initialization
│
├── libs/                   # Shared Libraries
│   ├── tx-types/           # TypeScript Type Definitions
│   │   ├── src/
│   │   │   ├── transaction.ts
│   │   │   ├── address.ts
│   │   │   ├── anomaly.ts
│   │   │   └── index.ts
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   ├── chain-utils/        # Blockchain Utility Functions
│   │   ├── src/
│   │   │   ├── web3-helper.ts
│   │   │   ├── address-validator.ts
│   │   │   ├── token-parser.ts
│   │   │   └── index.ts
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   └── msq-common/         # MSQ Ecosystem Common Functions
│       ├── src/
│       │   ├── constants.ts
│       │   ├── risk-calculator.ts
│       │   ├── whale-detector.ts
│       │   └── index.ts
│       ├── project.json
│       └── tsconfig.json
│
├── nx.json                 # NX Workspace Configuration
├── package.json            # Root Package Dependencies
├── tsconfig.base.json      # Base TypeScript Configuration
├── .gitignore             # Git Ignore Rules
├── README.md              # Project Documentation
├── CLAUDE.md              # AI Development Guidelines
└── docs/                  # Documentation
    └── PROJECT_STRUCTURE.md  # This file
```

## 🔧 Application Details

### 1. tx-dashboard (Frontend)

**Purpose**: Real-time transaction monitoring dashboard
**Technology**: React 18, TypeScript, Vite, WebSocket Client
**Port**: 3000

**Key Components**:

- `TransactionFeed`: Real-time transaction list
- `StatsDashboard`: Analytics and metrics display
- `AddressAnalyzer`: Address behavior analysis
- `AnomalyAlerts`: Suspicious transaction alerts
- `FilterPanel`: Transaction filtering and search

**Environment Variables**:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8001
VITE_APP_NAME=MSQ Transaction Monitor
VITE_REFRESH_INTERVAL=5000
```

### 2. tx-api (Backend API)

**Purpose**: GraphQL API for transaction data and statistics
**Technology**: NestJS, GraphQL, TypeScript, MySQL, Redis
**Port**: 8000

**Key Features**:

- GraphQL interface for complex queries
- Transaction and address data fetching
- Real-time data caching with Redis
- Secure and strongly-typed API

**Environment Variables**:

```env
PORT=8000
NODE_ENV=development
MYSQL_HOST=mysql
MYSQL_DATABASE=msq_monitor
REDIS_HOST=redis
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX_REQUESTS=100
```

**API Endpoint**:

- `POST /graphql` - Single endpoint for all GraphQL queries and mutations.

### 3. chain-scanner (Blockchain Scanner)

**Purpose**: Real-time blockchain transaction monitoring
**Technology**: Node.js, Web3.js/Ethers.js, WebSocket Server
**Port**: 8001 (WebSocket)

**Key Features**:

- Multi-RPC provider support with failover
- Real-time Transfer event detection
- Transaction validation and processing
- WebSocket broadcasting to clients
- Missed block recovery

**Environment Variables**:

```env
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_BACKUP_RPC_1=https://polygon.llamarpc.com
TOKEN_MSQ=0x...
TOKEN_SUT=0x...
TOKEN_KWT=0x...
TOKEN_P2UC=0x...
WS_PORT=8001
SCAN_INTERVAL_MS=5000
BLOCK_CONFIRMATION=12
```

**Monitoring Flow**:

1. Connect to Polygon RPC providers
2. Subscribe to Transfer events for target tokens
3. Validate and parse transaction data
4. Store in MySQL database
5. Broadcast to WebSocket clients
6. Handle RPC failover automatically

### 4. tx-analyzer (Analytics Engine)

**Status**: Temporarily Unused.

## 📊 Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Polygon Network │────│  chain-scanner   │────│ MySQL Database │
└─────────────────┘    └────────┬─────────┘    └─────────┬───────┘
                                │                        │
                                │ WebSocket              │ Queries
                                ▼                        ▼
                                              ┌─────────────────┐    ┌─────────────────┐
                                              │  tx-dashboard   │◄───│     tx-api      │
                                              │  (Frontend)     │    │ (GraphQL API)   │
                                              └─────────────────┘    └─────────────────┘
```

## 🔗 Inter-Service Communication

### 1. Real-time Data Flow

- **chain-scanner** → **tx-dashboard**: WebSocket for live transactions
- **chain-scanner** → **MySQL**: Direct database writes

### 2. API Data Flow

- **tx-dashboard** → **tx-api**: GraphQL queries for data
- **tx-api** → **MySQL**: Database queries
- **tx-api** → **Redis**: Caching layer

## 🐳 Docker Configuration

### Multi-stage Dockerfile.packages

Single Dockerfile that builds all services using build arguments:

```dockerfile
# Build stages for each service
FROM node:18-alpine AS base
FROM base AS tx-dashboard-runtime
FROM base AS tx-api-runtime
FROM base AS chain-scanner-runtime
```

### Service Dependencies

```yaml
# docker-compose.yml dependency chain
tx-dashboard:
  depends_on: [tx-api]
tx-api:
  depends_on: [mysql, redis]
chain-scanner:
  depends_on: [mysql, redis]
```

## 🔐 Security Architecture

### API Security

- Rate limiting: 100 requests/minute per IP
- CORS configuration for specific origins
- Input validation on all endpoints
- Parameterized queries to prevent SQL injection

### Network Security

- Services communicate via internal Docker network
- Only necessary ports exposed to host
- Environment-specific configurations

### Data Security

- Database credentials via environment variables
- No secrets in code or Docker images
- Redis for caching non-sensitive data only

## 📈 Scalability Design

### Horizontal Scaling

- Each service can be scaled independently
- Load balancer ready (nginx configuration included)
- Stateless service design

### Performance Optimization

- Redis caching for frequently accessed data
- Database indexing on transaction and address queries
- WebSocket connection pooling
- Efficient batch processing in scanner

### Resource Management

- Memory-efficient data structures
- Configurable batch sizes
- Connection pooling for databases
- Graceful shutdown handling

This architecture provides a robust, scalable, and maintainable foundation for real-time blockchain transaction monitoring with advanced analytics capabilities.
