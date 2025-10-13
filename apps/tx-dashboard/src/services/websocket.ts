/**
 * WebSocket service for real-time transaction updates
 * Features: Auto-reconnection, connection state management, error handling
 */

import { logger } from '@msq-tx-monitor/msq-common';

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface TransactionMessage {
  type:
    | 'new_transaction'
    | 'connection'
    | 'error'
    | 'heartbeat'
    | 'stats_update';
  data: unknown;
  timestamp: number;
}

export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export type WebSocketCallback = (message: TransactionMessage) => void;
export type ConnectionStateCallback = (state: ConnectionState) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;

  private callbacks: Set<WebSocketCallback> = new Set();
  private stateCallbacks: Set<ConnectionStateCallback> = new Set();

  constructor(config: Partial<WebSocketConfig> = {}) {
    // Build WebSocket URL based on current location when using Nginx
    const wsUrl = config.url || this.buildWebSocketUrl();

    this.config = {
      url: wsUrl,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  /**
   * Build WebSocket URL based on environment configuration or current window location
   *
   * Priority:
   * 1. VITE_WS_URL environment variable (e.g., ws://localhost:8001 or /ws)
   * 2. Auto-detect from window.location (for nginx proxy mode)
   * 3. Fallback to localhost:8001 (SSR mode)
   *
   * Environment Variable:
   * - VITE_WS_URL: WebSocket URL (absolute or relative path)
   *   - Development: ws://localhost:8001
   *   - Production (nginx): /ws (auto-detects ws:// or wss://)
   */
  private buildWebSocketUrl(): string {
    // 1. Check environment variable first
    const envWsUrl = import.meta.env.VITE_WS_URL;
    if (envWsUrl) {
      // If it's a relative path, build full URL based on current location
      if (envWsUrl.startsWith('/')) {
        if (typeof window === 'undefined') {
          return `ws://localhost:8001`;
        }
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}${envWsUrl}`;
      }
      // Absolute URL provided
      return envWsUrl;
    }

    // 2. Fallback: Auto-detect from window.location (nginx proxy mode)
    if (typeof window === 'undefined') {
      return 'ws://localhost:8001';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (
      this.ws?.readyState === WebSocket.CONNECTING ||
      this.ws?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventListeners();
    } catch (error) {
      logger.error('WebSocket connection failed', error);
      this.setConnectionState(ConnectionState.ERROR);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Send message to server
   */
  send(message: Record<string, unknown>): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        logger.error('Failed to send message', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Subscribe to WebSocket messages
   */
  subscribe(callback: WebSocketCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(callback: ConnectionStateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      logger.info('WebSocket connected');
      this.reconnectAttempts = 0;
      this.setConnectionState(ConnectionState.CONNECTED);
      this.startHeartbeat();
    };

    this.ws.onmessage = event => {
      try {
        const message: TransactionMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message', error);
      }
    };

    this.ws.onclose = event => {
      logger.info(`WebSocket closed: ${event.code} ${event.reason}`);
      this.clearTimers();

      if (event.code !== 1000) {
        // Not a normal closure
        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.scheduleReconnect();
      } else {
        this.setConnectionState(ConnectionState.DISCONNECTED);
      }
    };

    this.ws.onerror = error => {
      // 재연결 가능한 경우 warn, 최대 재시도 초과 시 error
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        logger.warn('WebSocket connection failed, will retry...', {
          attempt: this.reconnectAttempts + 1,
          maxAttempts: this.config.maxReconnectAttempts,
        });
      } else {
        logger.error(
          'WebSocket error: Max reconnection attempts reached',
          error
        );
      }
      this.setConnectionState(ConnectionState.ERROR);
    };
  }

  private handleMessage(message: TransactionMessage): void {
    // Handle heartbeat responses
    if (message.type === 'heartbeat') {
      return;
    }

    // Broadcast message to all subscribers
    this.callbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        logger.error('Error in WebSocket callback', error);
      }
    });
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.stateCallbacks.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          logger.error('Error in connection state callback', error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      this.setConnectionState(ConnectionState.ERROR);
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState(ConnectionState.RECONNECTING);

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    logger.info(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat', timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// Singleton instance
// Environment-aware WebSocket connection:
// - Development: ws://localhost:8001 (direct connection)
// - Production: /ws through nginx (auto-detects ws:// or wss://)
export const wsService = new WebSocketService();
