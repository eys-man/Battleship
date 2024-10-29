import { randomUUID } from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { updateWinners } from '../db/players';
import { updateRoom } from '../db/rooms';
import { Player, players, rooms } from '../db/db';
import { users } from '../db/db';
import { createGame } from '../db/game';

const WS_PORT = 3000;

export const wsServer = new WebSocketServer({ port: WS_PORT });

wsServer.on('connection', (ws: WebSocket) => {
  console.log(`New player connected`);
  let newPlayer: Player = {
    name: '',
  };

  users.set(ws, newPlayer); // добавить пользователя-клиента (пока без имени игрока)
  let responseMessage: string;

  ws.on('message', (message: string) => {
    const parsedMessage = JSON.parse(message);

    const data = { // для формирования ответа
      name: ``,
      index: ``,
      error: false,
      errorText: ``,
    };
    let indexPlayer = -1;
    let indexRoomWhere = -1;
    let indexRoomFrom = -1;
    let index = '';

    let firstPlayer = '';
    let secondPlayer = '';

    // разобрать тип запроса
    switch (parsedMessage.type) {
      //--------------------------------------------------
      case 'reg':
        newPlayer = JSON.parse(parsedMessage.data);

        console.log(
          `player: name=${newPlayer.name}, password=${newPlayer.password}`,
        );

        // проверить на существование в базе
        indexPlayer = players.findIndex(
          (player) => player.name === newPlayer.name,
        );
        if (indexPlayer !== -1) { // если нашли в базе с таким именем
          if (newPlayer.password === players[indexPlayer].password) { // если пароль подошел
            // проверить чела на онлайн
            if (users.values().find((i) => i.name === newPlayer.name)) {
              data.error = true;
              data.errorText = `This user is online!`;
            } else {
              // подготовить данные для выдачи от сервера клиенту
              data.index = players[indexPlayer].index as string;
              data.name = players[indexPlayer].name;
            }
          } else { // пароль не тот
            data.error = true;
            data.errorText = `Password no valid!`;
          }
        } else { // не нашли в базе, внести в базу нового игрока
          players.push({
            index: randomUUID(),
            name: newPlayer.name,
            password: newPlayer.password,
            wins: 0,
          });
          users.set(ws, {
            index: players[players.length-1].index,
            name: newPlayer.name,
            password: newPlayer.password,
            wins: 0,
          });

          indexPlayer = players.length - 1; // его индекс в массиве (базе игроков)

          data.index = players[indexPlayer].index as string;
          data.name = players[indexPlayer].name;
        }

        responseMessage = JSON.stringify({
          type: 'reg',
          data: JSON.stringify(data),
          id: 0,
        });

        ws.send(responseMessage);

        // добавить игрока в качестве пользователя этого клиента сервера
        users.set(ws, {
          index: data.index,
          name: data.name,
          password: newPlayer.password,
          wins: 0,
          ws: ws,
        });

        console.log(`число users = ${users.size}`);

        // обновить список комнат
        for (const user of users.keys()) {
          user.send(JSON.stringify(updateRoom()));
        }

        // обновить список победителей
        for (const user of users.keys()) {
          user.send(JSON.stringify(updateWinners()));
        }
        break;
      //-----------------------------------------------------
      case 'create_room':
        // нельзя создать больше одной комнаты одному челу (тупо так делать, хотя в задании про это ничего)
        index = users.get(ws).index;
        console.log(`индекс чела ${index}`);
        // проверить, есть ли чел в какой-нибудь комнате
        indexRoomFrom = rooms.findIndex( (i) => i.roomUsers[0].index === index );
        if (indexRoomFrom !== -1 ) {
          console.log(`нельзя создать больше одной комнаты!`);
          console.log(`вы щяс в комнате ${indexRoomFrom}`);
          break;
        };

        // создать комнату и добавить туда игрока
        rooms.push({ roomId: randomUUID(), roomUsers: [] });
        rooms[rooms.length - 1].roomUsers.push({
          name: users.get(ws).name,
          index: users.get(ws).index,
        });

        console.log(
          `всего комнат: ${rooms.length},
          в этой комнате находится ${JSON.stringify(rooms[rooms.length - 1].roomUsers[0].name)}`,
        );

        // обновить список доступных комнат
        for (const user of users.keys()) {
          user.send(JSON.stringify(updateRoom()));
        }

        // обновить список победителей
        for (const user of users.keys()) {
          user.send(JSON.stringify(updateWinners()));
        }
        break;
      //-----------------------------------------------------
      case 'add_user_to_room':
        console.log(`add_user_to_room: индекс комнаты ${JSON.parse(parsedMessage.data).indexRoom}`);

        indexRoomWhere = rooms.findIndex((i) => i.roomId === JSON.parse(parsedMessage.data).indexRoom);
        console.log(`вот в эту -> ${indexRoomWhere}`);
        // из какой комнаты чел переходит. ее удаляем
        indexRoomFrom = rooms.findIndex((i) => i.roomUsers[0].index === users.get(ws).index);
        console.log(`вот отсюда -> ${indexRoomFrom}`);

        if (indexRoomFrom !== -1) console.log(`имя чела в базах комнаты и клиента: ${rooms[indexRoomFrom].roomUsers[0].name} <--> ${users.get(ws).name}`);

        if ( indexRoomFrom === indexRoomWhere) {
          console.log(`нельзя зайти в свою комнату`);
          break;
        }

        // найти игрока этого клиента
        indexPlayer = users.get(ws).index;
        console.log(`добавляем в комнату игрока ${users.get(ws).name}`);
        rooms[indexRoomWhere].roomUsers.push(users.get(ws));

        firstPlayer = rooms[indexRoomWhere].roomUsers[0].index as string;
        secondPlayer = rooms[indexRoomWhere].roomUsers[0].index as string;

        console.log(`в комнате ${JSON.parse(parsedMessage.data).indexRoom} сейчас находятся ${rooms[indexRoomWhere].roomUsers[0].name} и ${rooms[indexRoomWhere].roomUsers[1].name}`);

        // удалить комнату, откуда чел пришел. если у него не было комнаты то не удаляем)
        if (indexRoomFrom !== -1) rooms.splice(indexRoomFrom, 1);
        // удалить комнату, куда чел пришел. там их уже двое, надо начинать игру
        rooms.splice(indexRoomWhere, 1);

        // обновить список доступных комнат
        for (const user of users.keys()) {
          user.send(JSON.stringify(updateRoom()));
          console.log(`щяс всего ${rooms.length} комнат`);
        }

        // отправить челам
        index = randomUUID(); // idGame
        ws.send(JSON.stringify( createGame(index, firstPlayer ) ));
        for (const [w, player] of users.entries()) {
          if (player.index === secondPlayer ) {
            console.log(`найден второй игрок`);
            w.send(JSON.stringify( createGame(index, secondPlayer ) ));
          }
        }

        break;
      //-----------------------------------------------------
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
  });

  ws.on('close', () => {
    // удалить из базы клиентов
    console.log(
      `щяс будет удален клиент с именем ${users.get(ws).name} и индексом ${users.get(ws).index}.\n
      но в базе зареганых игроков останется`,
    );
    users.delete(ws);
    console.log(`Player was disconnected`);
  });
});

console.log(`Start WebSocket server on the: ${WS_PORT} port`);

