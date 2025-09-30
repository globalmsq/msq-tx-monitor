import { Web3 } from 'web3';
import { CONNECTION_STATUS } from '../config/constants';
import { logger } from '@msq-tx-monitor/msq-common';

interface LogFilter {
  address?: string | string[];
  topics?: (string | string[] | null)[];
  fromBlock?: string;
  toBlock?: string;
}

export interface Web3ServiceConfig {
  primaryEndpoint: string;
  backupEndpoint: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  timeout: number;
}

export interface ConnectionStatus {
  status: string;
  endpoint: string;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

export class Web3Service {
  private web3: Web3 | null = null;
  private connectionStatus: ConnectionStatus;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private eventListeners: Map<string, ((data?: unknown) => void)[]> = new Map();
  private currentEndpoint: string = '';

  constructor(private serviceConfig: Web3ServiceConfig) {
    this.connectionStatus = {
      status: CONNECTION_STATUS.DISCONNECTED,
      endpoint: '',
      lastConnected: null,
      reconnectAttempts: 0,
    };
  }

  async connect(): Promise<void> {
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      await this.connectToPrimary();
    } catch (error) {
      logger.warn('Primary endpoint failed, trying backup:', error);
      try {
        await this.connectToBackup();
      } catch (backupError) {
        logger.error('Both endpoints failed:', backupError);
        this.scheduleReconnect();
      }
    } finally {
      this.isConnecting = false;
    }
  }

  private async connectToPrimary(): Promise<void> {
    return this.establishHttpConnection(this.serviceConfig.primaryEndpoint);
  }

  private async connectToBackup(): Promise<void> {
    return this.establishHttpConnection(this.serviceConfig.backupEndpoint);
  }

  private async establishHttpConnection(endpoint: string): Promise<void> {
    logger.info(`Attempting to connect to ${endpoint}...`);

    try {
      // Test connection with a simple blockNumber request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: [],
        }),
        signal: AbortSignal.timeout(this.serviceConfig.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await response.json()) as any;
      if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`);
      }

      logger.info(`Connected to ${endpoint}`);

      this.currentEndpoint = endpoint;
      this.web3 = new Web3(new Web3.providers.HttpProvider(endpoint));

      this.connectionStatus = {
        status: CONNECTION_STATUS.CONNECTED,
        endpoint,
        lastConnected: new Date(),
        reconnectAttempts: 0,
      };

      this.emit('connection', {
        status: CONNECTION_STATUS.CONNECTED,
        endpoint,
      });
    } catch (error) {
      logger.error(`HTTP connection error on ${endpoint}:`, error);
      throw error;
    }
  }

  private handleDisconnection(): void {
    this.connectionStatus.status = CONNECTION_STATUS.DISCONNECTED;
    this.cleanup();
    this.emit('disconnection', this.connectionStatus);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (
      this.connectionStatus.reconnectAttempts >=
      this.serviceConfig.maxReconnectAttempts
    ) {
      logger.error('Max reconnection attempts reached');
      this.connectionStatus.status = CONNECTION_STATUS.ERROR;
      this.emit('maxReconnectAttemptsReached', this.connectionStatus);
      return;
    }

    this.connectionStatus.status = CONNECTION_STATUS.RECONNECTING;
    this.connectionStatus.reconnectAttempts++;

    logger.info(
      `Scheduling reconnection attempt ${this.connectionStatus.reconnectAttempts}/${this.serviceConfig.maxReconnectAttempts} in ${this.serviceConfig.reconnectInterval}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.serviceConfig.reconnectInterval);

    this.emit('reconnecting', this.connectionStatus);
  }

  private requestId = 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getLogs(filter: LogFilter): Promise<any[]> {
    // Use current HTTP endpoint for log retrieval
    const httpEndpoint = this.currentEndpoint || this.connectionStatus.endpoint;

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: this.requestId++,
          method: 'eth_getLogs',
          params: [filter],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await response.json()) as any;

      if (data.error) {
        throw new Error(
          `RPC error: ${data.error.message || JSON.stringify(data.error)}`
        );
      }

      return data.result || [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('RPC request timed out after 10 seconds');
        throw new Error('RPC error: request timed out');
      }
      logger.error('Error fetching logs via HTTP:', error);
      throw error;
    }
  }

  async getLatestBlockNumber(): Promise<number> {
    const httpEndpoint = this.currentEndpoint || this.connectionStatus.endpoint;

    try {
      const response = await fetch(httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: this.requestId++,
          method: 'eth_blockNumber',
          params: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await response.json()) as any;

      if (data.error) {
        throw new Error(
          `RPC error: ${data.error.message || JSON.stringify(data.error)}`
        );
      }

      return parseInt(data.result, 16);
    } catch (error) {
      logger.error('Error fetching latest block number:', error);
      throw error;
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  getWeb3Instance(): Web3 | null {
    return this.web3;
  }

  isConnected(): boolean {
    return this.connectionStatus.status === CONNECTION_STATUS.CONNECTED;
  }

  on(event: string, listener: (data?: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  private cleanup(): void {
    if (this.web3) {
      this.web3 = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.currentEndpoint = '';
  }

  async disconnect(): Promise<void> {
    this.cleanup();
    this.connectionStatus.status = CONNECTION_STATUS.DISCONNECTED;
    this.emit('disconnection', this.connectionStatus);
  }
}
