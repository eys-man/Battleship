import { randomUUID } from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { updateWinners } from '../db/players';
import { updateRoom } from '../db/rooms';
import { Game, Player, games, players, rooms, ships, users } from '../db/db';
import { createGame } from '../db/game';

const WS_PORT = 3000;

export const wsServer = new WebSocketServer({ port: WS_PORT });

wsServer.on('connection', (ws: WebSocket) => {
  console.log(`New player connected`);
  let newPlayer: Player = {
    name: '',
  };

  // let newShip: Ship = {
  //   name: '',
  // };

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

    // let ships: Ship[] = [];
    let indexPlayer = -1;
    let indexRoomWhere = -1;
    let indexRoomFrom = -1;

    let index = '';
    
    let firstPlayer = '';
    let secondPlayer = '';
    let gameId = '';
    let game: Game = {
      firstPlayer: { isReady: false, playerId: ``},
      secondPlayer: { isReady: false, playerId: ``},
    };

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

        // console.log(`число users = ${users.size}`);

        // обновить список комнат
        for (const user of users.keys())
          user.send(JSON.stringify(updateRoom()));

        // обновить список победителей
        for (const user of users.keys())
          user.send(JSON.stringify(updateWinners()));

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

        // обновить список доступных комнат
        for (const user of users.keys())
          user.send(JSON.stringify(updateRoom()));

        // обновить список победителей
        for (const user of users.keys())
          user.send(JSON.stringify(updateWinners()));

        break;
      //-----------------------------------------------------
      case 'add_user_to_room':
        console.log(`add_user_to_room: индекс комнаты ${JSON.parse(parsedMessage.data).indexRoom}`);

        // индекс комнаты (в массиве) откуда чел уходит
        indexRoomWhere = rooms.findIndex((i) => i.roomId === JSON.parse(parsedMessage.data).indexRoom);
        // из какой комнаты чел переходит - ее будем удалять
        indexRoomFrom = rooms.findIndex((i) => i.roomUsers[0].index === users.get(ws).index);

        if (indexRoomFrom !== -1) console.log(`имя чела в базах комнаты и клиента: ${rooms[indexRoomFrom].roomUsers[0].name} <--> ${users.get(ws).name} должно быть одинаковым`);

        if ( indexRoomFrom === indexRoomWhere) {
          console.log(`нельзя зайти в свою комнату`);
          break;
        }

        // найти игрока этого клиента
        // index = users.get(ws).index;
        console.log(`добавляем в комнату игрока ${users.get(ws).name}`);
        rooms[indexRoomWhere].roomUsers.push(users.get(ws));

        firstPlayer = rooms[indexRoomWhere].roomUsers[0].index as string;
        secondPlayer = rooms[indexRoomWhere].roomUsers[1].index as string;

        console.log(`в комнате ${JSON.parse(parsedMessage.data).indexRoom} сейчас находятся ${rooms[indexRoomWhere].roomUsers[0].name} и ${rooms[indexRoomWhere].roomUsers[1].name}`);

        // удалить комнату, откуда чел пришел. если у него не было комнаты то не удаляем)
        if (indexRoomFrom !== -1) rooms.splice(indexRoomFrom, 1);
        // удалить комнату, куда чел пришел. там их уже двое, надо начинать игру
        rooms.splice(indexRoomWhere, 1);

        // обновить список доступных комнат
        for (const user of users.keys())
          user.send(JSON.stringify(updateRoom()));

        if( users.get(ws).index !== firstPlayer ) {
          secondPlayer = firstPlayer;
          firstPlayer = users.get(ws).index;
        };

        gameId = randomUUID(); // idGame

        games.set(gameId, {
          firstPlayer: {
            isReady: false,
            playerId: firstPlayer,
          },
          secondPlayer: {
            isReady: false,
            playerId: secondPlayer,
          },
        });
        // console.log(`щяс ${games.size} игр. в игре находятся`);
        // console.log(`${games.get(gameId).firstPlayer.playerId}`);
        // console.log(`${games.get(gameId).secondPlayer.playerId}`);

        // отправить челам
        ws.send(JSON.stringify( createGame(gameId, firstPlayer) ));
        for (const [w, player] of users.entries())
          if (player.index === secondPlayer )
            w.send(JSON.stringify( createGame(gameId, secondPlayer ) ));

        break;
      //-----------------------------------------------------
      case 'add_ships':
        // console.log(` add_ship: ${JSON.parse(parsedMessage.data)}`);

        gameId = JSON.parse(parsedMessage.data).gameId;
        // ships = JSON.parse(parsedMessage.data).ships;
        index = JSON.parse(parsedMessage.data).indexPlayer; // index игрока, string
        
        console.log(`gameId = ${gameId}, indexPlayer = ${index}, свой index = ${users.get(ws).index}`);
        console.log(`число игр ${games.size}`);

        if ( index === users.get(ws).index) {
          ships.push(JSON.parse(parsedMessage.data).ships);

          // начать игру
          // ws.send(JSON.stringify({
          //   type: "start_game",
          //   data: JSON.stringify({
          //     ships: ships,
          //     currentPlayerIndex: users.get(ws).index,
          //   }),
          //   id: 0,
          // }));

          // записать готовность чела играть
          game = games.get(gameId);
          // console.log(`записать готовность чела играть\nчисло игр в мапе games: ${games.size}`);
          // console.log(`index игрока = ${index}`);
          // games.forEach((value, key) => console.log(`key ${JSON.stringify(key)}, value ${JSON.stringify(value)} `));

          // console.log(`эту игру щяс готовим ${JSON.stringify(game)}`);
          if (game.firstPlayer.playerId === index) game.firstPlayer.isReady = true;
          else game.secondPlayer.isReady = true;

          games.set(gameId, game);
          games.forEach((value, key) => console.log(`key ${JSON.stringify(key)}, value ${JSON.stringify(value)} `));

          // если все готовы, начинаем
          if (games.get(gameId).firstPlayer.isReady && games.get(gameId).secondPlayer.isReady ) {
            // сначала отправит этот чел "старт" с присланными кораблями
            ws.send(JSON.stringify({
              type: "start_game",
              data: JSON.stringify({
                ships: ships.pop(),
                currentPlayerIndex: index,
              }),
              id: 0,
            }));
            // ход тоже будет его
            ws.send(JSON.stringify({
              type: "turn",
              data: JSON.stringify({
                currentPlayerIndex: index,
              }),
              id: 0,
            }));

            // затем его соперник отправит корабли
            // найти индекс соперника (осторожно! значение index при этом поменяем)
            if (game.firstPlayer.playerId === index) // значит первого уже отправили
              index = game.secondPlayer.playerId;
            else // значит второго отправили
              index = game.firstPlayer.playerId;

            // найти сокет соперника и отправить его корабли
            for (const [w, player] of users.entries())
              if (player.index === index )
                w.send(JSON.stringify({
                  type: "start_game",
                  data: JSON.stringify({
                    ships: ships.pop(),
                    currentPlayerIndex: index,
                  }),
                  id: 0,
                }));
          }
        }
        break;
      //-----------------------------------------------------
      case 'attack':
        break;
      case 'randomAttack':
        break;
      case 'finish':
        break;
      default:
        break;
    }
  });

  ws.on('close', () => {
    // удалить из базы клиентов
    users.delete(ws);
    console.log(`Player was disconnected`);
  });
});

console.log(`Start WebSocket server on the: ${WS_PORT} port`);

