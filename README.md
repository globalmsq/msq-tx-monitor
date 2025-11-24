# 🔗 MSQ Transaction Monitor

> Real-time Blockchain Transaction Monitoring System for MSQ Wallet Tokens

## 📋 Overview

MSQ Transaction Monitor is a comprehensive real-time monitoring platform that tracks token transactions on the Polygon network. Built as an NX monorepo, it provides live transaction feeds, analytics, and anomaly detection for the MSQ ecosystem tokens (MSQ, SUT, KWT, P2UC).

### ✨ Key Features

**Real-time Transaction Monitoring**

- Live tracking of Transfer events for 4 target tokens on Polygon network
- WebSocket-based real-time updates with sub-second latency
- Multiple RPC provider support with automatic failover
- Comprehensive transaction validation and data integrity checks

**Advanced Analytics & Intelligence**

- AI-powered anomaly detection for suspicious transaction patterns
- Address behavior analysis and whale identification
- Real-time statistics and trend analysis
- Interactive dashboards with filtering and search capabilities

**Scalable Microservice Architecture**

- NX monorepo with 3 independent applications
- Docker containerized deployment with one-command startup
- Horizontal scaling capabilities with Redis caching
- MySQL database with optimized indexing for high-performance queries

## 🏗️ Architecture

### Unified Nginx Reverse Proxy

All services are accessed through a single Nginx reverse proxy on **port 80**, eliminating CORS issues and providing unified routing:

```
                  ┌─────────────────────────────────┐
                  │    Nginx Reverse Proxy (80)     │
                  │      http://localhost           │
                  └──────────────┬──────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │ tx-dashboard │      │   tx-api     │      │chain-scanner │
  │   (3000)     │      │   (8000)     │      │   (8001)     │
  └──────────────┘      └──────────────┘      └──────────────┘
         │                       │
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         └─────────────►│  MySQL + Redis   │
                        └──────────────────┘
```

### Applications

| App               | Role                  | Technology              | Internal Port | Nginx Route          |
| ----------------- | --------------------- | ----------------------- | ------------- | -------------------- |
| **tx-dashboard**  | React Frontend        | React 18 + TypeScript   | 3000          | `/`                  |
| **tx-api**        | GraphQL API Server    | NestJS + GraphQL        | 8000          | `/graphql`           |
| **chain-scanner** | Blockchain Monitor    | Node.js + Web3.js       | 8001          | `/ws`                |
| **tx-analyzer**   | (Temporarily Unused)  | -                       | -             | -                    |

### Data Flow

```
Polygon Network → chain-scanner → MySQL → tx-api
                      ↓
                 Nginx (Unified Access)
                      ↓
                 tx-dashboard (React UI)
```

## 🚀 Quick Start

### 1. Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for development)

### 2. Clone and Setup

```bash
git clone <repository-url> msq-tx-monitor
cd msq-tx-monitor

# Copy environment files
cp apps/tx-api/.env.example apps/tx-api/.env
cp apps/chain-scanner/.env.example apps/chain-scanner/.env
```

### 3. Start with Docker

```bash
# Development mode (with hot reload)
npm run docker:dev

# Production mode
npm run docker:up
```

### 4. Access Services

All services are accessible through **http://localhost** via Nginx reverse proxy:

- **Dashboard**: http://localhost (React UI)
- **Transaction API**: http://localhost/api/v1/transactions
- **Address API**: http://localhost/api/v1/addresses
- **Analysis API**: http://localhost/api/v1/analyze
- **Statistics API**: http://localhost/api/v1/statistics
- **WebSocket**: ws://localhost/ws
- **Database (Direct)**: http://localhost:3306

> **Note**: Individual service ports (3000, 8000, 8001, 8002) are internal only and not exposed externally.

## 🎯 Execution Modes

The system supports two execution modes depending on your development workflow:

### Mode 1: Docker Compose + Nginx (Recommended for Production)

**Features:**
- Unified entry point through Nginx reverse proxy at port 80
- All services containerized and orchestrated
- No CORS issues - all services accessed through same origin
- Production-like environment

**Configuration:**
```bash
# Use .env.production for tx-dashboard
cp apps/tx-dashboard/.env.production apps/tx-dashboard/.env

# Start all services
npm run docker:up
```

**Access:**
- Dashboard: http://localhost
- All APIs: http://localhost/api/v1/*
- WebSocket: ws://localhost/ws

### Mode 2: Direct Execution (for Active Development)

**Features:**
- Run services directly with `pnpm dev` for hot reload
- No Docker overhead
- Direct access to individual services on different ports
- CORS automatically configured for localhost:3000

**Configuration:**
```bash
# Use .env.development for tx-dashboard
cp apps/tx-dashboard/.env.development apps/tx-dashboard/.env

# Start services manually
pnpm --filter=tx-api dev          # Port 8000
pnpm --filter=chain-scanner dev    # Port 8001
pnpm --filter=tx-dashboard dev     # Port 3000
```

**Access:**
- Dashboard: http://localhost:3000
- TX API: http://localhost:8000/api/v1/*
- TX Analyzer: http://localhost:8002/api/v1/*
- WebSocket: ws://localhost:8001

**Environment Variables:**

For **Mode 1 (Docker + Nginx)**:
```env
# apps/tx-dashboard/.env.production
VITE_TX_API_URL=/api/v1
VITE_WS_URL=/ws
```

For **Mode 2 (Direct Execution)**:
```env
# apps/tx-dashboard/.env.development
VITE_TX_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8001
```

> **Note**: Backend services automatically enable CORS for `http://localhost:3000` in development mode.

## 🔧 Development

### NX Commands

```bash
# Install dependencies
npm install

# Serve individual apps
nx serve tx-api         # Express API
nx serve chain-scanner  # Blockchain scanner

# Build all apps
nx build-all

# Test all apps
nx test-all
```

### Environment Variables

#### Nginx Configuration

```nginx
# All services routed through Nginx on port 80
# Configuration: docker/nginx.conf

Upstreams:
- tx-dashboard:3000  → /
- tx-api:8000        → /api/v1/graphql
- chain-scanner:8001 → /ws
```

#### tx-api

```env
PORT=8000
MYSQL_HOST=mysql
MYSQL_DATABASE=msq_monitor
REDIS_HOST=redis
CORS_ORIGIN=http://localhost  # Simplified via Nginx
```

#### chain-scanner

```env
POLYGON_RPC_URL=https://polygon-rpc.com
TOKEN_MSQ=0x...
TOKEN_SUT=0x...
TOKEN_KWT=0x...
TOKEN_P2UC=0x...
WS_PORT=8001
CORS_ORIGIN=http://localhost  # Simplified via Nginx
```

#### tx-dashboard

```env
VITE_API_ENDPOINT=/api/v1      # Relative path for Nginx routing
VITE_WS_URL=/ws                # Relative path for Nginx routing
```

## 📁 Project Structure

```
msq-tx-monitor/
├── apps/
│   ├── tx-dashboard/     # React frontend (port 3000)
│   ├── tx-api/           # NestJS (GraphQL) API (port 8000)
│   ├── chain-scanner/    # Blockchain scanner (port 8001)
│   └── tx-analyzer/      # Analytics service (Temporarily Unused)
├── docker/
│   ├── docker-compose.yml      # Orchestrates all services + Nginx
│   ├── nginx.conf              # Nginx reverse proxy config
│   ├── Dockerfile.packages     # Multi-stage build
│   └── volumes/
├── libs/
│   ├── tx-types/         # Shared TypeScript types
│   ├── chain-utils/      # Blockchain utilities
│   └── msq-common/       # MSQ common functions
├── nx.json               # NX workspace config
└── package.json          # Root dependencies
```

## 🎯 Target Tokens

The system monitors these MSQ ecosystem tokens:

- **MSQ** - Main MSQ token
- **SUT** - Stablecoin Utility Token
- **KWT** - Kingdomware Token
- **P2UC** - Pay2Use Coin

## 🔍 API Endpoints

All endpoints accessed through **http://localhost** via Nginx:

### Transaction API (tx-api)

```bash
POST /graphql           # Single endpoint for all GraphQL queries and mutations.
```

### WebSocket Events

```javascript
// Real-time transaction feed (through Nginx)
ws://localhost/ws

// Events:
// - new_transaction: Real-time transaction updates
// - stats_update: Statistics changes
// - heartbeat: Connection health check
// - connection: Initial connection confirmation
// - error: Error notifications
```

## 🐳 Docker Services

### Infrastructure Services

- **Nginx**: Reverse proxy and unified entry point (port 80)
- **MySQL 8.0**: Transaction database (port 3306)
- **Redis 7**: Caching and real-time data (port 6379)

### Application Services

All services are internally networked through Docker Compose:

- **tx-dashboard** (3000): React frontend with Vite dev server
- **tx-api** (8000): NestJS GraphQL API with MySQL/Redis
- **chain-scanner** (8001): Blockchain scanner with WebSocket server

**Features:**
- Hot-reload enabled for development
- Production-ready multi-stage builds
- Health checks and automatic restart policies
- Service-to-service communication via Docker network
- External access only through Nginx reverse proxy

## 📊 Monitoring & Observability

- **Health Checks**: All services have health endpoints
- **Logging**: Structured logging with correlation IDs
- **Metrics**: Performance and business metrics
- **Alerts**: Real-time anomaly notifications

## 🔐 Security

- **Unified Access Control**: All traffic routed through Nginx reverse proxy
- **Simplified CORS**: Single origin (http://localhost) eliminates cross-origin issues
- **API Rate Limiting**: 100 requests/minute per IP
- **Internal Service Isolation**: Application ports not exposed externally
- **Input Validation**: All API inputs validated
- **SQL Injection Prevention**: Parameterized queries only
- **WebSocket Security**: Proper upgrade headers and timeout configuration

## 📄 License

MIT License - Built for the MSQ ecosystem

---

**🚀 Powered by NX Monorepo | 🔗 Polygon Network | 🤖 AI Analytics**
