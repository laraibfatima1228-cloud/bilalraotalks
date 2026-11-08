type SocketEventHandler = (payload: any) => void;

class RealtimeSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<SocketEventHandler>> = new Map();
  private reconnectTimer: any = null;
  private isExplicitlyClosed = false;
  private queue: string[] = [];

  constructor() {
    this.connect();
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Flush queue
        while (this.queue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
          const item = this.queue.shift();
          if (item) this.ws.send(item);
        }
        this.emitLocal('connected', { isConnected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;
          this.emitLocal(type, data);
        } catch (e) {
          console.warn('Socket message parse error', e);
        }
      };

      this.ws.onclose = () => {
        this.emitLocal('disconnected', { isConnected: false });
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 2500);
  }

  public send(type: string, data: any = {}): void {
    const payload = JSON.stringify({ type, data });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.queue.push(payload);
      this.connect();
    }
  }

  public on(event: string, handler: SocketEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  public off(event: string, handler: SocketEventHandler): void {
    const eventSet = this.listeners.get(event);
    if (eventSet) {
      eventSet.delete(handler);
    }
  }

  private emitLocal(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((handler) => {
        try {
          handler(data);
        } catch (e) {
          console.error(`Error in socket listener for ${event}:`, e);
        }
      });
    }
  }

  public close(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const realtimeSocket = new RealtimeSocketClient();
