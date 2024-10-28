import { WebSocket, WebSocketServer } from 'ws';
import { handlePlayer, updateWinners } from '../db/players';
import { addToRoom, createRoom, updateRoom } from '../db/rooms';

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
        ws.send(responseMessage);
        // обновить список доступных комнат с одним челом
        responseMessage = JSON.stringify(updateRoom());
        ws.send(responseMessage);
        // обновить список победителей
        responseMessage = JSON.stringify(updateWinners());
        ws.send(responseMessage);
        break;
      case 'update_winners':
        // обновить список победителей
        responseMessage = JSON.stringify(updateWinners());
        ws.send(responseMessage);
        break;
      case 'create_room':
        // создать и добавить туда игрока
        createRoom();
        // обновить список доступных комнат с одним челом
        responseMessage = JSON.stringify(updateRoom());
        ws.send(responseMessage);
        break;
      case 'add_user_to_room':
        console.log(`индекс комнаты ${parsedMessage.data}`);
        addToRoom(parsedMessage.data);
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
    // ws.send(responseMessage);
  });

  ws.on('close', () => {
    console.log(`Player was disconnected`);
  });
});

console.log(`Start WebSocket server on the: ${WS_PORT} port`);