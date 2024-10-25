import { WebSocket, WebSocketServer } from 'ws';

const WS_PORT = 4000;

const wsServer = new WebSocketServer({ port: 8080 });

wsServer.on('connection', (ws: WebSocket) => {
  console.log(`New Client connected`);

  ws.on('message', (message: string) => {
    const parsedMessage = JSON.parse(message);
    console.log(`Received: ${parsedMessage}`);

    // TODE: управлять сообщением
  });

  ws.on('close', () => {
    console.log(`Client was disconnected`);
  });
});

console.log(`Start WebSocket server on the: ${WS_PORT} port`);