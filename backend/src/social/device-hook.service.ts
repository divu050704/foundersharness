import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import WebSocket from 'ws';

@Injectable()
export class DeviceHookService implements OnModuleInit, OnModuleDestroy {


  // private readonly logger = new Logger(DeviceHookService.name);
  private ws: WebSocket | null = null;

  private readonly wsUrl = "ws://localhost:9000/";

  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
    }
  >();

  private messageIdCounter = 0;

  private reconnectTimeout: NodeJS.Timeout | null = null;

  private isConnected = false;

  private activeSessionName = "default";

  async connect(): Promise<void> {
    if (this.isHookConnected()) {
      return;
    }

    return new Promise((resolve, reject) => {
      console.log(
        `Connecting to device-hook WebSocket at ${this.wsUrl}...`,
      );

      const socket = new WebSocket(this.wsUrl);

      this.ws = socket;

      socket.on("open", () => {
        this.isConnected = true;

        console.log(
          "Successfully connected to device-hook C# helper.",
        );

        resolve();
      });

      socket.on("message", (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());

          if (response?.id) {
            const pending = this.pendingRequests.get(response.id);

            if (pending) {
              this.pendingRequests.delete(response.id);

              if (response.status === "error") {
                pending.reject(
                  new Error(
                    response.message || "Device hook error",
                  ),
                );
              } else {
                pending.resolve(response.result);
              }
            }
          }
        } catch (err) {
          console.error(
            "Failed to parse WebSocket message:",
            err,
          );
        }
      });

      socket.on("close", () => {
        this.isConnected = false;

        console.warn(
          "Connection to device-hook closed.",
        );

        this.scheduleReconnect();
      });

      socket.on("error", (err) => {
        this.isConnected = false;

        console.error(
          "device-hook WebSocket error:",
          err.message,
        );

        reject(err);
      });
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;

      this.connect().catch(() => {});
    }, 5000);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
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

  setActiveSessionName(name: string) {
    this.activeSessionName = name || "default";

    console.log(
      `Active browser session set to: ${this.activeSessionName}`,
    );
  }

  getActiveSessionName(): string {
    return this.activeSessionName;
  }

  isHookConnected(): boolean {
    return (
      this.isConnected &&
      this.ws?.readyState === WebSocket.OPEN
    );
  }

  async sendCommand(
    action: string,
    params: Record<string, any> = {},
    timeoutMs = 40000,
  ): Promise<any> {

    if (!this.isHookConnected()) {
      await this.connect();
    }

    if (!this.isHookConnected()) {
      throw new Error(
        "device-hook helper is not running or connected.",
      );
    }

    const id =
      `backend_${Date.now()}_${this.messageIdCounter++}`;

    const payload = {
      id,
      action,
      sessionName:
        params.sessionName || this.activeSessionName,
      ...params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);

          reject(
            new Error(
              `Command '${action}' timed out after ${
                timeoutMs / 1000
              } seconds.`,
            ),
          );
        }
      }, timeoutMs);

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
        this.ws!.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }
}
