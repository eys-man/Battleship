import { WebSocket, WebSocketServer } from 'ws';
import { handlePlayer } from '../db/db';

const WS_PORT = 3000;

export const wsServer = new WebSocketServer({ port: WS_PORT });

wsServer.on('connection', (ws: WebSocket) => {
  console.log(`New player connected`);
  let responseMessage: string;

  ws.on('message', (message: string) => {
    const parsedMessage = JSON.parse(message);
    // разобрать тип запроса
    switch (parsedMessage.type) {
      case 'reg':
        responseMessage = JSON.stringify(handlePlayer(message));
        // console.log(`responseMessage ${responseMessage}`);
        break;
      case 'update_winners':
        break;
      case 'create_room':
        break;
      case 'add_user_to_room':
        break;
      case 'create_game':
        break;
      case 'update_room':
        break;
      case 'add_ships':
        break;
      case 'start_game':
        break;
      case 'attack':
        break;
      case 'randomAttack':
        break;
      case 'turn':
        break;
      case 'finish':
        break;
      default:
        break;
    }
    // отправить клиенту ответ
    console.log(`клиенту будет отправлено ${responseMessage}`);
    ws.send(responseMessage);
  });

  ws.on('close', () => {
    console.log(`Player was disconnected`);
  });
});

console.log(`Start WebSocket server on the: ${WS_PORT} port`);