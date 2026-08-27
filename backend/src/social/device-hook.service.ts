// import {
//   Injectable,
//   Logger,
//   OnModuleInit,
//   OnModuleDestroy,
// } from '@nestjs/common';
import WebSocket from 'ws';

// @Injectable()
// export class DeviceHookService implements OnModuleInit, OnModuleDestroy {
export class DeviceHookService{

  // private readonly logger = new Logger(DeviceHookService.name);
  private ws: WebSocket | null = null;
  private readonly wsUrl = 'ws://localhost:9000/';
  private pendingRequests = new Map<string, (value: any) => void>();
  private messageIdCounter = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  private connect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // this.logger.log(`Connecting to device-hook WebSocket at ${this.wsUrl}...`);

    try {
      const socket = new WebSocket(this.wsUrl);
      this.ws = socket;

      socket.on('open', () => {
        this.isConnected = true;
        // this.logger.log('Successfully connected to device-hook C# helper.');
      });

      socket.on('message', (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response && response.id) {
            const resolve = this.pendingRequests.get(response.id);
            if (resolve) {
              resolve(response);
              this.pendingRequests.delete(response.id);
            }
          }
        } catch (err) {
          // this.logger.error(
            // 'Failed to parse WebSocket message from device-hook:',
            // err,
          // );
        }
      });

      socket.on('close', () => {
        this.isConnected = false;
        // this.logger.warn(
        //   'Connection to device-hook closed. Retrying in 5 seconds...',
        // );
        this.scheduleReconnect();
      });

      socket.on('error', (err) => {
        this.isConnected = false;
        // this.logger.error(`device-hook WebSocket error: ${err.message}`);
      });
    } catch (error) {
      this.isConnected = false;
      // this.logger.error('Error establishing WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.isConnected = false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }

  private activeSessionName = 'default';

  setActiveSessionName(name: string) {
    this.activeSessionName = name || 'default';
    // this.logger.log(`Active browser session set to: ${this.activeSessionName}`);
  }

  getActiveSessionName(): string {
    return this.activeSessionName;
  }

  isHookConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  async sendCommand(
    action: string,
    params: Record<string, any> = {},
    timeoutMs = 40000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isHookConnected()) {
        return reject(
          new Error(
            'device-hook helper is not running or connected. Please launch the desktop helper app.',
          ),
        );
      }

      const id = `backend_${Date.now()}_${this.messageIdCounter++}`;
      const payload = {
        id,
        action,
        sessionName: params.sessionName || this.activeSessionName,
        ...params,
      };

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(
            new Error(
              `Command '${action}' timed out after ${timeoutMs / 1000} seconds.`,
            ),
          );
        }
      }, timeoutMs);

      this.pendingRequests.set(id, (response) => {
        clearTimeout(timeout);
        if (response.status === 'error') {
          reject(
            new Error(response.message || `Error executing action: ${action}`),
          );
        } else {
          resolve(response.result);
        }
      });

      try {
        this.ws?.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }
}
