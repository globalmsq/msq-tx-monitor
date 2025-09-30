import WebSocket from 'ws';
import { createServer } from 'http';
import { config } from '../config';
import { EVENT_TYPES, CONNECTION_STATUS } from '../config/constants';
import { StatisticsService } from './statisticsService';
import { logger } from '@msq-tx-monitor/msq-common';

export interface Client {
  id: string;
  socket: WebSocket;
  isAlive: boolean;
  connectedAt: Date;
  lastSeen: Date;
}

export interface BroadcastMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: Date;
}

export class WebSocketServer {
  private server: WebSocket.Server | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private httpServer: any = null;
  private clients: Map<string, Client> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private statisticsService: StatisticsService;

  constructor(statisticsService: StatisticsService) {
    this.statisticsService = statisticsService;
    this.setupSignalHandlers();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('WebSocket server is already running');
      return;
    }

    try {
      // Create HTTP server
      this.httpServer = createServer();

      // Create WebSocket server
      this.server = new WebSocket.Server({
        server: this.httpServer,
        maxPayload: 16 * 1024, // 16KB max payload
      });

      this.setupWebSocketHandlers();
      this.startHeartbeat();

      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.httpServer.listen(config.websocket.port, (error: any) => {
          if (error) {
            reject(error);
          } else {
            logger.info(
              `WebSocket server started on port ${config.websocket.port}`
            );
            this.isRunning = true;
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error('Failed to start WebSocket server:', error);
      throw error;
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.server) return;

    this.server.on('connection', (socket: WebSocket, _request) => {
      const clientId = this.generateClientId();
      const client: Client = {
        id: clientId,
        socket,
        isAlive: true,
        connectedAt: new Date(),
        lastSeen: new Date(),
      };

      this.clients.set(clientId, client);
      logger.info(
        `Client connected: ${clientId} (Total: ${this.clients.size})`
      );

      // Check connection limit
      if (this.clients.size > config.websocket.maxConnections) {
        logger.warn(
          `Max connections exceeded (${this.clients.size}/${config.websocket.maxConnections})`
        );
        socket.close(1008, 'Max connections exceeded');
        this.clients.delete(clientId);
        return;
      }

      // Send welcome message with stats
      this.sendWelcomeMessageWithStats(clientId);

      // Set up client event handlers
      this.setupClientHandlers(clientId, socket);
    });

    this.server.on('error', error => {
      logger.error('WebSocket server error:', error);
    });

    this.server.on('close', () => {
      logger.info('WebSocket server closed');
      this.cleanup();
    });
  }

  private setupClientHandlers(clientId: string, socket: WebSocket): void {
    socket.on('message', data => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        logger.error(`Error parsing message from client ${clientId}:`, error);
        this.sendToClient(clientId, {
          type: EVENT_TYPES.ERROR,
          data: { message: 'Invalid JSON message' },
          timestamp: new Date(),
        });
      }
    });

    socket.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.isAlive = true;
        client.lastSeen = new Date();
      }
    });

    socket.on('close', (code, reason) => {
      logger.info(
        `Client disconnected: ${clientId} (Code: ${code}, Reason: ${reason.toString()})`
      );
      this.clients.delete(clientId);
    });

    socket.on('error', error => {
      logger.error(`Client error ${clientId}:`, error);
      this.clients.delete(clientId);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastSeen = new Date();

    switch (message.type) {
      case 'ping':
      case 'heartbeat':
        this.sendToClient(clientId, {
          type: 'pong',
          data: { serverTime: new Date() },
          timestamp: new Date(),
        });
        break;

      case 'subscribe':
        // Handle subscription to specific events
        this.handleSubscription(clientId, message.data);
        break;

      case 'unsubscribe':
        // Handle unsubscription
        this.handleUnsubscription(clientId, message.data);
        break;

      default:
        logger.warn(
          `Unknown message type from client ${clientId}:`,
          message.type
        );
    }
  }

  private async handleSubscription(
    clientId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscriptionData: any
  ): Promise<void> {
    // In this implementation, all clients receive all events
    // This could be extended to support selective subscriptions
    logger.info(`Client ${clientId} subscribed to:`, subscriptionData);

    // Send subscription confirmation without stats to avoid duplication
    // (stats were already sent in welcome message)
    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      data: { subscription: subscriptionData },
      timestamp: new Date(),
    });
  }

  private handleUnsubscription(
    clientId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unsubscriptionData: any
  ): void {
    logger.info(`Client ${clientId} unsubscribed from:`, unsubscriptionData);

    this.sendToClient(clientId, {
      type: 'unsubscription_confirmed',
      data: { unsubscription: unsubscriptionData },
      timestamp: new Date(),
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Send welcome message with dashboard statistics
   */
  private async sendWelcomeMessageWithStats(clientId: string): Promise<void> {
    try {
      // Get fresh statistics
      const stats = await this.statisticsService.getDashboardStats();

      // Send connection message with stats
      this.sendToClient(clientId, {
        type: 'connection',
        data: {
          status: CONNECTION_STATUS.CONNECTED,
          clientId,
          serverTime: new Date(),
          stats: stats,
        },
        timestamp: new Date(),
      });

      if (config.logging.enableDatabaseLogs) {
        logger.info(`📊 Stats sent to client ${clientId}:`, {
          totalTransactions: stats.totalTransactions,
          activeAddresses: stats.activeAddresses,
          tokenStatsCount: stats.tokenStats.length,
        });
      }
    } catch (error) {
      logger.error(`❌ Error sending stats to client ${clientId}:`, error);

      // Send connection message without stats as fallback
      this.sendToClient(clientId, {
        type: EVENT_TYPES.CONNECTION_STATUS,
        data: {
          status: CONNECTION_STATUS.CONNECTED,
          clientId,
          serverTime: new Date(),
        },
        timestamp: new Date(),
      });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, config.websocket.heartbeatInterval);
  }

  private performHeartbeat(): void {
    const deadClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (!client.isAlive) {
        deadClients.push(clientId);
        return;
      }

      client.isAlive = false;
      client.socket.ping();
    });

    // Remove dead clients
    deadClients.forEach(clientId => {
      logger.info(`Removing dead client: ${clientId}`);
      const client = this.clients.get(clientId);
      if (client) {
        client.socket.terminate();
        this.clients.delete(clientId);
      }
    });

    if (deadClients.length > 0) {
      logger.info(`Cleaned up ${deadClients.length} dead connections`);
    }
  }

  broadcast(message: BroadcastMessage): void {
    if (!this.isRunning || this.clients.size === 0) {
      return;
    }

    const messageString = JSON.stringify(message);
    let successCount = 0;
    let failureCount = 0;

    this.clients.forEach((client, clientId) => {
      try {
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(messageString);
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        logger.error(`Error sending to client ${clientId}:`, error);
        failureCount++;
      }
    });

    if (config.logging.enableBlockchainLogs) {
      logger.info(
        `Broadcast sent: ${successCount} success, ${failureCount} failures`
      );
    }
  }

  sendToClient(clientId: string, message: BroadcastMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Error sending to client ${clientId}:`, error);
      return false;
    }
  }

  getConnectedClients(): { count: number; clients: Omit<Client, 'socket'>[] } {
    const clientInfo = Array.from(this.clients.values()).map(client => ({
      id: client.id,
      isAlive: client.isAlive,
      connectedAt: client.connectedAt,
      lastSeen: client.lastSeen,
    }));

    return {
      count: this.clients.size,
      clients: clientInfo,
    };
  }

  getServerStatus(): {
    isRunning: boolean;
    port: number;
    clientCount: number;
    maxConnections: number;
    heartbeatInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      port: config.websocket.port,
      clientCount: this.clients.size,
      maxConnections: config.websocket.maxConnections,
      heartbeatInterval: config.websocket.heartbeatInterval,
    };
  }

  private setupSignalHandlers(): void {
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Received shutdown signal, closing WebSocket server...');

    // Notify all clients about server shutdown
    this.broadcast({
      type: EVENT_TYPES.CONNECTION_STATUS,
      data: {
        status: CONNECTION_STATUS.DISCONNECTED,
        reason: 'Server shutdown',
      },
      timestamp: new Date(),
    });

    // Close all client connections
    this.clients.forEach(client => {
      client.socket.close(1001, 'Server shutdown');
    });

    await this.stop();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping WebSocket server...');

    this.cleanup();

    // Close server
    if (this.server) {
      await new Promise<void>(resolve => {
        this.server!.close(() => {
          logger.info('WebSocket server closed');
          resolve();
        });
      });
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>(resolve => {
        this.httpServer.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }

    this.isRunning = false;
  }

  /**
   * Broadcast updated statistics to all connected clients
   */
  async broadcastStatsUpdate(): Promise<void> {
    if (!this.isRunning || this.clients.size === 0) {
      return;
    }

    try {
      const stats = await this.statisticsService.getDashboardStats();

      this.broadcast({
        type: 'stats_update',
        data: { stats },
        timestamp: new Date(),
      });

      if (config.logging.enableDatabaseLogs) {
        logger.info('📊 Stats update broadcasted to all clients');
      }
    } catch (error) {
      logger.error('❌ Error broadcasting stats update:', error);
    }
  }

  private cleanup(): void {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clear clients
    this.clients.clear();
  }
}
