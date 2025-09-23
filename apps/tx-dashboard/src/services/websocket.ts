/**
 * WebSocket service for real-time transaction updates
 * Features: Auto-reconnection, connection state management, error handling
 */

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface TransactionMessage {
  type: 'transaction' | 'connection' | 'error' | 'heartbeat';
  data: any;
  timestamp: number;
}

export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
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
    this.config = {
      url: config.url || 'ws://localhost:8001/ws',
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.CONNECTING ||
        this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
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
  send(message: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
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
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.setConnectionState(ConnectionState.CONNECTED);
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: TransactionMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.clearTimers();

      if (event.code !== 1000) { // Not a normal closure
        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.scheduleReconnect();
      } else {
        this.setConnectionState(ConnectionState.DISCONNECTED);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
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
        console.error('Error in WebSocket callback:', error);
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
          console.error('Error in connection state callback:', error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.setConnectionState(ConnectionState.ERROR);
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState(ConnectionState.RECONNECTING);

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

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
export const wsService = new WebSocketService({
  url: import.meta.env.VITE_WS_ENDPOINT + '/ws' || 'ws://localhost:8001/ws'
});