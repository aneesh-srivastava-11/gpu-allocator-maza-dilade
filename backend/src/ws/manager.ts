import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

class ConnectionManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  public init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/status' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log('[WS] New UI client connected. Total clients:', this.clients.size);

      ws.on('message', (message: string) => {
        // Heartbeat or ping handling
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('[WS] Client disconnected. Remaining:', this.clients.size);
      });

      ws.on('error', (err) => {
        console.error('[WS ERROR]', err);
        this.clients.delete(ws);
      });
    });

    console.log('[WS] WebSocket server initialized on path /ws/status');
  }

  public broadcast(eventType: string, data: any) {
    const payload = JSON.stringify({ type: eventType, data });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}

export const wsManager = new ConnectionManager();
