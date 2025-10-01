import 'dotenv/config';
import { Web3Service } from './services/web3Service';
import { DatabaseService } from './services/databaseService';
import { TokenService } from './services/tokenService';
import { EventMonitor } from './services/eventMonitor';
import { WebSocketServer } from './services/websocketServer';
import { StatisticsService } from './services/statisticsService';
import { config } from './config';
import { EVENT_TYPES } from './config/constants';
import { logger } from '@msq-tx-monitor/msq-common';

class ChainScanner {
  private web3Service: Web3Service;
  private databaseService: DatabaseService;
  private tokenService: TokenService;
  private eventMonitor: EventMonitor;
  private websocketServer: WebSocketServer;
  private statisticsService: StatisticsService;
  private isRunning = false;
  private statsUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize services
    this.web3Service = new Web3Service({
      primaryEndpoint: config.blockchain.primary.endpoint,
      backupEndpoint: config.blockchain.backup.endpoint,
      reconnectInterval: config.blockchain.reconnectInterval,
      maxReconnectAttempts: config.blockchain.maxReconnectAttempts,
      timeout: config.blockchain.primary.timeout,
    });

    this.databaseService = new DatabaseService();
    this.tokenService = new TokenService(this.databaseService);
    this.statisticsService = new StatisticsService(this.tokenService);
    this.eventMonitor = new EventMonitor(
      this.web3Service,
      this.databaseService,
      this.tokenService
    );
    this.websocketServer = new WebSocketServer(this.statisticsService);

    this.setupEventHandlers();
    this.setupSignalHandlers();
  }

  private setupEventHandlers(): void {
    // Forward blockchain events to WebSocket clients
    this.eventMonitor.on(
      EVENT_TYPES.NEW_TRANSACTION,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (transactionData: any) => {
        this.websocketServer.broadcast({
          type: EVENT_TYPES.NEW_TRANSACTION,
          data: transactionData,
          timestamp: transactionData.timestamp,
        });
      }
    );

    // Forward connection status to WebSocket clients
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.web3Service.on('connection', (status: any) => {
      this.websocketServer.broadcast({
        type: EVENT_TYPES.CONNECTION_STATUS,
        data: status,
        timestamp: new Date(),
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.web3Service.on('disconnection', (status: any) => {
      this.websocketServer.broadcast({
        type: EVENT_TYPES.CONNECTION_STATUS,
        data: status,
        timestamp: new Date(),
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.web3Service.on('reconnecting', (status: any) => {
      this.websocketServer.broadcast({
        type: EVENT_TYPES.CONNECTION_STATUS,
        data: status,
        timestamp: new Date(),
      });
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Chain scanner is already running');
      return;
    }

    logger.info('Starting MSQ Chain Scanner...');
    logger.info(`Environment: ${config.server.env}`);
    logger.info(`WebSocket Server Port: ${config.websocket.port}`);
    logger.info(`Primary Endpoint: ${config.blockchain.primary.endpoint}`);
    logger.info(`Backup Endpoint: ${config.blockchain.backup.endpoint}`);

    try {
      // 1. Initialize database
      logger.info('Initializing database connection...');
      await this.databaseService.initialize();

      // 2. Initialize token service
      logger.info('Initializing token service...');
      await this.tokenService.initialize();

      // 3. Initialize statistics service
      logger.info('Initializing statistics service...');
      await this.statisticsService.initialize();

      // 4. Start WebSocket server
      logger.info('Starting WebSocket server...');
      await this.websocketServer.start();

      // 5. Connect to blockchain
      logger.info('Connecting to Polygon network...');
      await this.web3Service.connect();

      // 6. Health check
      await this.performHealthCheck();

      // 7. Start periodic statistics updates
      this.startStatsUpdates();

      this.isRunning = true;
      logger.info('✅ MSQ Chain Scanner started successfully!');
      logger.info(
        `📊 Monitoring status: ${JSON.stringify(this.eventMonitor.getMonitoringStatus(), null, 2)}`
      );
      logger.info(
        `🔗 WebSocket server: ${JSON.stringify(this.websocketServer.getServerStatus(), null, 2)}`
      );
    } catch (error) {
      logger.error('❌ Failed to start chain scanner:', error);
      await this.shutdown();
      throw error;
    }
  }

  private async performHealthCheck(): Promise<void> {
    logger.info('Performing health check...');

    // Check database connectivity
    const dbHealthy = await this.databaseService.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }

    // Check statistics service
    const statsHealthy = await this.statisticsService.healthCheck();
    if (!statsHealthy) {
      throw new Error('Statistics service health check failed');
    }

    // Check blockchain connectivity
    const web3Connected = this.web3Service.isConnected();
    if (!web3Connected) {
      throw new Error('Blockchain connection health check failed');
    }

    // Check WebSocket server
    const wsStatus = this.websocketServer.getServerStatus();
    if (!wsStatus.isRunning) {
      throw new Error('WebSocket server health check failed');
    }

    logger.info('✅ All health checks passed');
  }

  private setupSignalHandlers(): void {
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('uncaughtException', error => {
      logger.error('Uncaught exception:', error);
      this.gracefulShutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection:', { promise, reason });
      this.gracefulShutdown();
    });
  }

  /**
   * Start periodic statistics updates
   */
  private startStatsUpdates(): void {
    // Broadcast stats every 30 seconds
    this.statsUpdateInterval = setInterval(async () => {
      try {
        await this.websocketServer.broadcastStatsUpdate();
      } catch (error) {
        logger.error('❌ Error in periodic stats update:', error);
      }
    }, 30000); // 30 seconds

    logger.info('📊 Periodic statistics updates started (30s interval)');
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Received shutdown signal, initiating graceful shutdown...');
    await this.shutdown();
    process.exit(0);
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Shutting down chain scanner...');

    try {
      // 1. Stop statistics updates
      if (this.statsUpdateInterval) {
        clearInterval(this.statsUpdateInterval);
        this.statsUpdateInterval = null;
        logger.info('Statistics updates stopped');
      }

      // 2. Stop event monitoring
      logger.info('Stopping event monitoring...');
      await this.eventMonitor.stopMonitoring();

      // 3. Disconnect from blockchain
      logger.info('Disconnecting from blockchain...');
      await this.web3Service.disconnect();

      // 4. Stop WebSocket server
      logger.info('Stopping WebSocket server...');
      await this.websocketServer.stop();

      // 5. Disconnect from database
      logger.info('Disconnecting from database...');
      await this.databaseService.disconnect();

      this.isRunning = false;
      logger.info('✅ Chain scanner shut down successfully');
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
    }
  }

  getStatus(): {
    isRunning: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    web3Status: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    monitoringStatus: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    websocketStatus: any;
    environment: string;
  } {
    return {
      isRunning: this.isRunning,
      web3Status: this.web3Service.getConnectionStatus(),
      monitoringStatus: this.eventMonitor.getMonitoringStatus(),
      websocketStatus: this.websocketServer.getServerStatus(),
      environment: config.server.env,
    };
  }
}

// Start the application
const chainScanner = new ChainScanner();

chainScanner.start().catch(error => {
  logger.error('Failed to start chain scanner:', error);
  process.exit(1);
});

// Export for testing
export default ChainScanner;
