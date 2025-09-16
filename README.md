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
- NX monorepo with 4 independent applications
- Docker containerized deployment with one-command startup
- Horizontal scaling capabilities with Redis caching
- MySQL database with optimized indexing for high-performance queries

## 🏗️ Architecture

### Applications

| App | Role | Technology | Port |
|-----|------|------------|------|
| **tx-dashboard** | Web Interface | React 18 + TypeScript | 3000 |
| **tx-api** | REST API Server | Express.js + TypeScript | 8000 |
| **chain-scanner** | Blockchain Monitor | Node.js + Web3.js | 8001 |
| **tx-analyzer** | AI Analytics | Python + FastAPI | 8002 |

### Data Flow
```
Polygon Network → chain-scanner → MySQL → tx-api → tx-dashboard
                      ↓
                 tx-analyzer (Real-time Analysis)
```

## 🚀 Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)
- Python 3.11+ (for analytics service)

### 2. Clone and Setup
```bash
git clone <repository-url> msq-tx-monitor
cd msq-tx-monitor

# Copy environment files
cp apps/tx-dashboard/.env.example apps/tx-dashboard/.env
cp apps/tx-api/.env.example apps/tx-api/.env
cp apps/chain-scanner/.env.example apps/chain-scanner/.env
cp apps/tx-analyzer/.env.example apps/tx-analyzer/.env
```

### 3. Start with Docker
```bash
# Development mode (with hot reload)
npm run docker:dev

# Production mode
npm run docker:up
```

### 4. Access Services
- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/api-docs
- **WebSocket**: ws://localhost:8001
- **Analytics**: http://localhost:8002/docs
- **Database Admin**: http://localhost:8080

## 🔧 Development

### NX Commands
```bash
# Install dependencies
npm install

# Serve individual apps
nx serve tx-dashboard    # React dashboard
nx serve tx-api         # Express API
nx serve chain-scanner  # Blockchain scanner
nx serve tx-analyzer    # Python analytics

# Build all apps
nx build-all

# Test all apps
nx test-all
```

### Environment Variables

#### tx-dashboard
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8001
```

#### tx-api
```env
PORT=8000
MYSQL_HOST=mysql
MYSQL_DATABASE=msq_monitor
REDIS_HOST=redis
```

#### chain-scanner
```env
POLYGON_RPC_URL=https://polygon-rpc.com
TOKEN_MSQ=0x...
TOKEN_SUT=0x...
TOKEN_KWT=0x...
TOKEN_P2UC=0x...
WS_PORT=8001
```

#### tx-analyzer
```env
PORT=8002
ANOMALY_THRESHOLD=0.85
WHALE_THRESHOLD=1000000
```

## 📁 Project Structure

```
msq-tx-monitor/
├── apps/
│   ├── tx-dashboard/      # React dashboard
│   ├── tx-api/           # Express.js API
│   ├── chain-scanner/    # Blockchain scanner
│   └── tx-analyzer/      # Python analytics
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.packages
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

### Transaction API
```bash
GET /api/v1/transactions           # List transactions
GET /api/v1/transactions/:hash     # Transaction details
GET /api/v1/addresses/:address     # Address statistics
GET /api/v1/statistics             # Global statistics
GET /api/v1/anomalies             # Detected anomalies
```

### WebSocket Events
```javascript
// Real-time transaction feed
ws://localhost:8001/scanner

// Events:
// - new_transaction
// - anomaly_detected
// - statistics_updated
```

## 🧠 AI Features

### Anomaly Detection
- **Volume Anomalies**: Unusually large transactions
- **Frequency Anomalies**: High-frequency trading patterns
- **Behavioral Anomalies**: Suspicious address behaviors
- **Pattern Recognition**: Wash trading, bot detection

### Analytics
- **Whale Tracking**: Large holder identification
- **Risk Scoring**: Address risk assessment
- **Pattern Analysis**: Trading pattern classification
- **Trend Detection**: Market trend identification

## 🐳 Docker Services

### Core Services
- **MySQL 8.0**: Transaction database
- **Redis 7**: Caching and real-time data
- **PHPMyAdmin**: Database management UI

### Application Services
- All apps containerized with hot-reload for development
- Production-ready multi-stage builds
- Health checks and automatic restart policies

## 📊 Monitoring & Observability

- **Health Checks**: All services have health endpoints
- **Logging**: Structured logging with correlation IDs
- **Metrics**: Performance and business metrics
- **Alerts**: Real-time anomaly notifications

## 🔐 Security

- **API Rate Limiting**: 100 requests/minute per IP
- **CORS Protection**: Configurable origins
- **Input Validation**: All API inputs validated
- **SQL Injection Prevention**: Parameterized queries only

## 📄 License

MIT License - Built for the MSQ ecosystem

---

**🚀 Powered by NX Monorepo | 🔗 Polygon Network | 🤖 AI Analytics**