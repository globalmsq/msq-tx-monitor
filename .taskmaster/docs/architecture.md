# MSQ Transaction Monitor - Technical Architecture

## System Overview

MSQ Transaction Monitor is a real-time blockchain transaction monitoring system built as an NX monorepo with microservice architecture. The system tracks token transactions on the Polygon network for the MSQ ecosystem tokens.

## Architecture Principles

- **Microservice Architecture**: Independent, loosely coupled services
- **Real-time Processing**: Sub-second transaction detection and analysis
- **Scalable Design**: Horizontal scaling capabilities with Docker
- **Data Integrity**: Comprehensive validation and error handling
- **AI-Powered Analytics**: Machine learning for anomaly detection

## Application Structure

### 1. tx-dashboard (Frontend)
**Role**: Real-time transaction monitoring user interface
**Technology**: React 18 + TypeScript + Vite
**Port**: 3000

**Key Features**:
- Real-time WebSocket connection for live transaction feed
- Interactive charts and analytics dashboards
- Address behavior analysis and statistics
- Anomaly alerts and notifications
- Responsive design for mobile/desktop

**Integration Points**:
- WebSocket connection to chain-scanner (port 8001)
- REST API calls to tx-api (port 8000)
- Real-time updates without page refresh

### 2. tx-api (Backend API)
**Role**: REST API server for data access and business logic
**Technology**: Express.js + TypeScript + MySQL + Redis
**Port**: 8000

**Key Features**:
- RESTful API endpoints for transaction data
- Address statistics aggregation and caching
- Rate limiting and security middleware
- API documentation with Swagger/OpenAPI
- Database connection pooling

**API Endpoints**:
```
GET /api/v1/transactions       # Transaction list with pagination
GET /api/v1/addresses/:address # Address-specific statistics
GET /api/v1/statistics         # Global system statistics
GET /api/v1/anomalies          # Detected anomaly list
GET /api/v1/health             # Health check endpoint
```

**Integration Points**:
- MySQL database for data persistence
- Redis cache for performance optimization
- CORS-enabled for frontend communication

### 3. chain-scanner (Blockchain Monitor)
**Role**: Real-time blockchain transaction scanning and collection
**Technology**: Node.js + Web3.js/Ethers.js + WebSocket
**Port**: 8001 (WebSocket Server)

**Key Features**:
- Multi-RPC provider support with automatic failover
- Real-time Transfer event detection for target tokens
- Transaction validation and data normalization
- WebSocket server for real-time client updates
- Missed block recovery and data consistency

**Blockchain Configuration**:
- **Primary RPC**: https://polygon-rpc.com
- **Backup RPCs**: polygon.llamarpc.com, polygon.drpc.org
- **Target Tokens**: MSQ, SUT, KWT, P2UC
- **Block Confirmations**: 12 blocks
- **Polling Interval**: 5 seconds

**Data Processing Pipeline**:
1. **Event Detection**: Monitor Transfer events on target tokens
2. **Data Validation**: Verify transaction data integrity
3. **Database Storage**: Store validated transactions in MySQL
4. **Real-time Broadcast**: Send updates via WebSocket
5. **Error Recovery**: Handle RPC failures and retry logic

### 4. tx-analyzer (Analytics Engine)
**Role**: AI-powered transaction analysis and anomaly detection
**Technology**: Python 3.11 + FastAPI + Scikit-learn + Pandas
**Port**: 8002

**Key Features**:
- Machine learning-based anomaly detection
- Address behavior profiling and risk scoring
- Statistical analysis and trend detection
- Whale transaction identification
- Automated alerting system

**Analysis Algorithms**:
- **Isolation Forest**: For outlier detection
- **Statistical Analysis**: Z-score and percentile-based detection
- **Pattern Recognition**: Time series analysis
- **Behavioral Profiling**: Address interaction patterns

**Detection Categories**:
- Volume anomalies (unusually large transactions)
- Frequency anomalies (high-frequency trading)
- Behavioral anomalies (suspicious patterns)
- Market manipulation indicators

## Data Architecture

### Database Schema (MySQL 8.0)

**transactions**
```sql
CREATE TABLE transactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    hash VARCHAR(66) UNIQUE NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_index INT NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value DECIMAL(38,0) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    gas_used BIGINT,
    gas_price BIGINT,
    anomaly_score DECIMAL(5,4) DEFAULT 0,
    is_anomaly BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_block_number (block_number),
    INDEX idx_from_address (from_address),
    INDEX idx_to_address (to_address),
    INDEX idx_token_address (token_address),
    INDEX idx_timestamp (timestamp),
    INDEX idx_anomaly (is_anomaly, anomaly_score)
);
```

**address_statistics**
```sql
CREATE TABLE address_statistics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    total_sent DECIMAL(38,0) DEFAULT 0,
    total_received DECIMAL(38,0) DEFAULT 0,
    transaction_count INT DEFAULT 0,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    risk_score DECIMAL(5,4) DEFAULT 0,
    is_whale BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_address_token (address, token_address),
    INDEX idx_address (address),
    INDEX idx_risk_score (risk_score),
    INDEX idx_whale (is_whale)
);
```

**anomalies**
```sql
CREATE TABLE anomalies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    transaction_hash VARCHAR(66) NOT NULL,
    anomaly_type ENUM('volume', 'frequency', 'behavioral', 'pattern') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    score DECIMAL(5,4) NOT NULL,
    description TEXT,
    metadata JSON,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed BOOLEAN DEFAULT FALSE,
    INDEX idx_severity (severity),
    INDEX idx_type (anomaly_type),
    INDEX idx_detected (detected_at),
    FOREIGN KEY (transaction_hash) REFERENCES transactions(hash)
);
```

### Caching Strategy (Redis 7)

**Cache Keys**:
- `stats:global` - Global system statistics (TTL: 60s)
- `stats:address:{address}` - Address-specific stats (TTL: 300s)
- `stats:token:{symbol}` - Token-specific stats (TTL: 120s)
- `anomalies:recent` - Recent anomaly list (TTL: 30s)

**Real-time Data**:
- `stream:transactions` - Live transaction stream
- `queue:analysis` - Analysis job queue
- `alerts:active` - Active alert status

## Network Architecture

### Service Communication

```
┌─────────────────┐    WebSocket (8001)    ┌─────────────────┐
│  tx-dashboard   │◄──────────────────────►│  chain-scanner  │
│   (Frontend)    │                        │   (Scanner)     │
└─────────┬───────┘    REST API (8000)     └─────────┬───────┘
          │                                          │
          ▼                                          ▼
┌─────────────────┐                        ┌─────────────────┐
│     tx-api      │                        │ MySQL Database │
│   (Backend)     │◄───────────────────────┤   (Storage)     │
└─────────┬───────┘                        └─────────────────┘
          │                                          ▲
          ▼                                          │
┌─────────────────┐    Analysis Data        ┌───────┴─────────┐
│ Redis Cache     │◄──────────────────────►│  tx-analyzer    │
│  (Memory)       │                        │  (Analytics)    │
└─────────────────┘                        └─────────────────┘
```

### Docker Network Configuration

**Internal Network**: `msq-network` (bridge driver)
- All services communicate via service names
- Only necessary ports exposed to host
- Automatic service discovery

**Port Mapping**:
- Host:3000 → tx-dashboard:80 (nginx)
- Host:8000 → tx-api:8000
- Host:8001 → chain-scanner:8001
- Host:8002 → tx-analyzer:8002
- Host:3306 → mysql:3306
- Host:6379 → redis:6379

## Deployment Architecture

### Docker Configuration

**Dockerfile.packages** - Multi-stage build for all services:
```dockerfile
# Build arguments determine which service to build
ARG SERVICE_NAME
FROM node:18-alpine AS base
...
FROM ${SERVICE_NAME}-runtime AS final
```

**docker-compose.yml** - Production deployment:
- Health checks for all services
- Restart policies (unless-stopped)
- Volume mounts for data persistence
- Environment variable injection

**docker-compose.dev.yml** - Development environment:
- Source code volume mounting
- Hot reload capabilities
- Debug port mappings
- Development-specific configurations

### Environment Management

Each application maintains independent environment configuration:

**tx-dashboard/.env**:
- Frontend API endpoints
- WebSocket connection settings
- UI configuration options

**tx-api/.env**:
- Database connection parameters
- Redis cache configuration
- API security settings

**chain-scanner/.env**:
- Polygon RPC endpoints
- Token contract addresses
- Scanning parameters

**tx-analyzer/.env**:
- Analysis algorithm parameters
- ML model configurations
- Alert thresholds

## Performance & Scalability

### Performance Optimization

**Database**:
- Optimized indexes on frequently queried columns
- Connection pooling (max 10 connections per service)
- Query optimization with EXPLAIN analysis
- Partitioning by date for large tables

**Caching**:
- Redis for frequently accessed data
- Application-level caching for static data
- Query result caching with appropriate TTL

**Real-time Processing**:
- WebSocket connection pooling
- Event-driven architecture
- Asynchronous processing where possible

### Scalability Strategy

**Horizontal Scaling**:
- Stateless service design
- Load balancer ready (nginx configuration)
- Database connection pooling
- Redis cluster support

**Resource Management**:
- Memory-efficient data structures
- Configurable batch processing
- Graceful shutdown handling
- Resource monitoring and alerting

## Security Architecture

### API Security
- Rate limiting: 100 requests/minute per IP
- CORS configuration for allowed origins
- Input validation and sanitization
- SQL injection prevention (parameterized queries)

### Network Security
- Internal Docker network isolation
- Minimal port exposure
- Environment-based configuration
- No hardcoded secrets

### Data Security
- Database credentials via environment variables
- Redis for non-sensitive caching only
- Audit logging for sensitive operations
- Regular security updates

## Monitoring & Observability

### Health Monitoring
- Health check endpoints for all services
- Docker health check integration
- Database connection monitoring
- RPC provider status tracking

### Logging Strategy
- Structured logging (JSON format)
- Correlation IDs for request tracing
- Error tracking and alerting
- Performance metrics collection

### Alerting System
- Anomaly detection alerts
- System health alerts
- Performance degradation warnings
- RPC provider failover notifications

This architecture provides a robust, scalable, and maintainable foundation for real-time blockchain transaction monitoring with advanced analytics capabilities.