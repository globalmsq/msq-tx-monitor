import { Web3Service } from './services/web3Service';
import { DatabaseService } from './services/databaseService';
import { TokenService } from './services/tokenService';
import { EventMonitor } from './services/eventMonitor';
import { WebSocketServer } from './services/websocketServer';
import { config } from './config';
import { EVENT_TYPES } from './config/constants';

class ChainScanner {
  private web3Service: Web3Service;
  private databaseService: DatabaseService;
  private tokenService: TokenService;
  private eventMonitor: EventMonitor;
  private websocketServer: WebSocketServer;
  private isRunning = false;

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
    this.eventMonitor = new EventMonitor(
      this.web3Service,
      this.databaseService,
      this.tokenService
    );
    this.websocketServer = new WebSocketServer();

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
          timestamp: new Date(),
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
      console.log('Chain scanner is already running');
      return;
    }

    console.log('Starting MSQ Chain Scanner...');
    console.log(`Environment: ${config.server.env}`);
    console.log(`WebSocket Server Port: ${config.websocket.port}`);
    console.log(`Primary Endpoint: ${config.blockchain.primary.endpoint}`);
    console.log(`Backup Endpoint: ${config.blockchain.backup.endpoint}`);

    try {
      // 1. Initialize database
      console.log('Initializing database connection...');
      await this.databaseService.initialize();

      // 2. Initialize token service
      console.log('Initializing token service...');
      await this.tokenService.initialize();

      // 3. Start WebSocket server
      console.log('Starting WebSocket server...');
      await this.websocketServer.start();

      // 4. Connect to blockchain
      console.log('Connecting to Polygon network...');
      await this.web3Service.connect();

      // 5. Health check
      await this.performHealthCheck();

      this.isRunning = true;
      console.log('✅ MSQ Chain Scanner started successfully!');
      console.log(
        `📊 Monitoring status: ${JSON.stringify(this.eventMonitor.getMonitoringStatus(), null, 2)}`
      );
      console.log(
        `🔗 WebSocket server: ${JSON.stringify(this.websocketServer.getServerStatus(), null, 2)}`
      );
    } catch (error) {
      console.error('❌ Failed to start chain scanner:', error);
      await this.shutdown();
      throw error;
    }
  }

  private async performHealthCheck(): Promise<void> {
    console.log('Performing health check...');

    // Check database connectivity
    const dbHealthy = await this.databaseService.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
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

    console.log('✅ All health checks passed');
  }

  private setupSignalHandlers(): void {
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('uncaughtException', error => {
      console.error('Uncaught exception:', error);
      this.gracefulShutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('Received shutdown signal, initiating graceful shutdown...');
    await this.shutdown();
    process.exit(0);
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Shutting down chain scanner...');

    try {
      // 1. Stop event monitoring
      console.log('Stopping event monitoring...');
      await this.eventMonitor.stopMonitoring();

      // 2. Disconnect from blockchain
      console.log('Disconnecting from blockchain...');
      await this.web3Service.disconnect();

      // 3. Stop WebSocket server
      console.log('Stopping WebSocket server...');
      await this.websocketServer.stop();

      // 4. Disconnect from database
      console.log('Disconnecting from database...');
      await this.databaseService.disconnect();

      this.isRunning = false;
      console.log('✅ Chain scanner shut down successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
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
  console.error('Failed to start chain scanner:', error);
  process.exit(1);
});

// Export for testing
export default ChainScanner;
