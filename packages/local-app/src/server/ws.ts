import { WebSocketServer, WebSocket } from 'ws';
import { ALPHADATE_PROTOCOL_VERSION } from '@alphadate/contracts';

export interface WsServerDeps {
  port: number;
  host: string;
}

export function createWsServer(deps: WsServerDeps): WebSocketServer {
  const wss = new WebSocketServer({ port: deps.port, host: deps.host });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log(`[WsServer] Client connected from ${req.socket.remoteAddress}`);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Heartbeat handler
        if (msg.type === 'HEARTBEAT') {
          ws.send(
            JSON.stringify({
              type: 'HEARTBEAT_ACK',
              timestamp: Date.now(),
              version: ALPHADATE_PROTOCOL_VERSION,
            })
          );
        }
      } catch (err) {
        console.error('[WsServer] Bad JSON received:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WsServer] Client disconnected');
    });
  });

  console.log(`[WsServer] WebSocket listening on ws://${deps.host}:${deps.port}`);
  return wss;
}
