import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { TransactionResponseDto } from './dto/transaction-response.dto.js';

/**
 * WebSocket Gateway for real-time transaction updates
 * Provides Socket.IO namespace at /transactions
 */
@WebSocketGateway({
  namespace: '/transactions',
  cors: {
    origin: '*', // Configure appropriately for production
  },
})
export class TransactionsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TransactionsGateway.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Gateway initialization hook
   */
  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized on /transactions namespace');
  }

  /**
   * Client connection handler
   * Sends welcome message with initial statistics
   */
  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    try {
      // Send welcome message with recent transaction count
      const recentTransactions =
        await this.transactionsService.getRecentTransactions(10);

      client.emit('welcome', {
        message: 'Connected to MSQ Transaction Monitor',
        timestamp: new Date().toISOString(),
        recentTransactionCount: recentTransactions.length,
      });
    } catch (error) {
      this.logger.error(
        `Error sending welcome message: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Client disconnection handler
   * Cleans up client from all rooms
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to transaction updates
   * Supports room-based subscriptions:
   * - 'all-transactions': All transactions
   * - 'token:{symbol}': Transactions for specific token (e.g., 'token:MSQ')
   * - 'anomalies': Only anomaly transactions
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket
  ) {
    const { room } = data;

    // Validate room format
    if (!room || typeof room !== 'string') {
      client.emit('error', { message: 'Invalid room format' });
      return;
    }

    // Join room
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to room: ${room}`);

    client.emit('subscribed', {
      room,
      message: `Successfully subscribed to ${room}`,
    });
  }

  /**
   * Unsubscribe from transaction updates
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket
  ) {
    const { room } = data;

    // Validate room format
    if (!room || typeof room !== 'string') {
      client.emit('error', { message: 'Invalid room format' });
      return;
    }

    // Leave room
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from room: ${room}`);

    client.emit('unsubscribed', {
      room,
      message: `Successfully unsubscribed from ${room}`,
    });
  }

  /**
   * Heartbeat handler to keep connection alive
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * Broadcast new transaction to relevant rooms
   * Called by external services when new transaction is detected
   */
  broadcastNewTransaction(transaction: TransactionResponseDto) {
    // Broadcast to all-transactions room
    this.server.to('all-transactions').emit('new_transaction', transaction);

    // Broadcast to token-specific room
    const tokenRoom = `token:${transaction.token.symbol}`;
    this.server.to(tokenRoom).emit('new_transaction', transaction);

    // Broadcast to anomalies room if transaction has anomaly indicators
    if (transaction.isMint || transaction.isBurn) {
      this.server.to('anomalies').emit('new_transaction', transaction);
    }

    this.logger.debug(
      `Broadcasted transaction ${transaction.id} to relevant rooms`
    );
  }

  /**
   * Broadcast transaction statistics update
   * Called periodically by stats calculation service
   */
  broadcastStatsUpdate(stats: {
    totalTransactions: number;
    last24Hours: number;
    topTokens: Array<{ symbol: string; count: number }>;
  }) {
    this.server.emit('stats_update', {
      ...stats,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug('Broadcasted stats update');
  }
}
