import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import WebSocket, { WebSocketServer } from 'ws';

@Injectable()
export class DeviceHookService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceHookService.name);
  private wss: WebSocketServer | null = null;
  private frontendSockets = new Set<WebSocket>();
  private readonly relayPort = parseInt(process.env.RELAY_WS_PORT || '5001', 10);

  private isDeviceHookConnectedToFrontend = false;

  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
    }
  >();

  private messageIdCounter = 0;
  private activeSessionName = 'default';

  onModuleInit() {
    this.startRelayServer();
  }

  onModuleDestroy() {
    this.stopRelayServer();
  }

  private startRelayServer() {
    try {
      this.wss = new WebSocketServer({ port: this.relayPort });
      this.logger.log(`Backend WebSocket relay server listening on ws://localhost:${this.relayPort}`);

      this.wss.on('connection', (ws: WebSocket) => {
        this.logger.log('Frontend relay client connected to backend WebSocket server.');
        this.frontendSockets.add(ws);

        ws.on('message', (data: WebSocket.Data) => {
          this.handleFrontendMessage(data);
        });

        ws.on('close', () => {
          this.logger.warn('Frontend relay client disconnected from backend WebSocket server.');
          this.frontendSockets.delete(ws);
          if (this.frontendSockets.size === 0) {
            this.isDeviceHookConnectedToFrontend = false;
          }
        });

        ws.on('error', (err) => {
          this.logger.error(`Frontend relay WebSocket error: ${err.message}`);
        });
      });
    } catch (err: any) {
      this.logger.error(`Failed to start relay server on port ${this.relayPort}: ${err.message}`);
    }
  }

  private stopRelayServer() {
    for (const ws of this.frontendSockets) {
      try {
        ws.close();
      } catch {}
    }
    this.frontendSockets.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  private handleFrontendMessage(data: WebSocket.Data) {
    try {
      const message = JSON.parse(data.toString());

      if (message?.type === 'device-hook-status') {
        this.isDeviceHookConnectedToFrontend = !!message.connected;
        this.logger.log(`Frontend reported device-hook status: connected=${this.isDeviceHookConnectedToFrontend}`);
        return;
      }

      if (message?.id) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          if (message.status === 'error') {
            pending.reject(new Error(message.message || 'Device hook error'));
          } else {
            pending.resolve(message.result);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Failed to parse WebSocket message from frontend relay: ${err.message}`);
    }
  }

  async connect(): Promise<void> {
    if (this.isHookConnected()) {
      return;
    }
    return new Promise((resolve, reject) => {
      if (this.isHookConnected()) {
        resolve();
        return;
      }
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 500;
        if (this.isHookConnected()) {
          clearInterval(interval);
          resolve();
        } else if (elapsed >= 5000) {
          clearInterval(interval);
          reject(new Error('Frontend relay client is not connected to backend WebSocket server.'));
        }
      }, 500);
    });
  }

  disconnect() {
    this.stopRelayServer();
    this.startRelayServer();
  }

  setActiveSessionName(name: string) {
    this.activeSessionName = name || 'default';
    this.logger.log(`Active browser session set to: ${this.activeSessionName}`);
  }

  getActiveSessionName(): string {
    return this.activeSessionName;
  }

  isHookConnected(): boolean {
    const hasActiveSocket = Array.from(this.frontendSockets).some(
      (ws) => ws.readyState === WebSocket.OPEN,
    );
    return hasActiveSocket && this.isDeviceHookConnectedToFrontend;
  }

  private getActiveFrontendSocket(): WebSocket | null {
    for (const ws of this.frontendSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        return ws;
      }
    }
    return null;
  }

  async sendCommand(
    action: string,
    params: Record<string, any> = {},
    timeoutMs = 60000,
  ): Promise<any> {
    let ws = this.getActiveFrontendSocket();
    if (!ws) {
      try {
        await this.connect();
        ws = this.getActiveFrontendSocket();
      } catch (e) {}
    }

    if (!ws) {
      throw new Error('No frontend relay client is currently connected to backend.');
    }

    const id = `backend_${Date.now()}_${this.messageIdCounter++}`;
    const actionLower = action.toLowerCase();
    const isHeavyAction = ['navigate', 'launch', 'open'].includes(actionLower);
    const effectiveTimeoutMs = params.timeoutMs || (isHeavyAction ? Math.max(90000, timeoutMs) : timeoutMs);

    const payload = {
      id,
      action,
      sessionName: params.sessionName || this.activeSessionName,
      timeoutMs: effectiveTimeoutMs,
      ...params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(
            new Error(
              `Command '${action}' timed out after ${effectiveTimeoutMs / 1000} seconds.`,
            ),
          );
        }
      }, effectiveTimeoutMs);

      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      try {
        ws.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }
}
