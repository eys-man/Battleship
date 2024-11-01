import { randomUUID } from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { updateWinners } from '../db/players';
import { updateRoom } from '../db/rooms';
import { Game, Player, games, players, rooms, users } from '../db/db';
import { attack, createGame, startGame } from '../db/game';

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
    let enemyId = '';
    let firstPlayer = '';
    let secondPlayer = '';
    let gameId = '';
    let game: Game = {
      currentPlayer: '',
      firstPlayer: {
        isReady: false,
        playerId: ``,
        ships: [],
        battleField: new Array(10).fill(new Array<number>(10).fill(0)),
      },
      secondPlayer: {
        isReady: false,
        playerId: ``,
        ships: [],
        battleField: new Array(10).fill(new Array<number>(10).fill(0))
      },
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
        rooms[indexRoomWhere].roomUsers.push(users.get(ws));

        firstPlayer = rooms[indexRoomWhere].roomUsers[0].index as string;
        secondPlayer = rooms[indexRoomWhere].roomUsers[1].index as string;

        console.log(`в комнате ${JSON.parse(parsedMessage.data).indexRoom} сейчас находятся ${rooms[indexRoomWhere].roomUsers[0].name} и ${rooms[indexRoomWhere].roomUsers[1].name}`);

        // удалить комнату, откуда чел пришел. если у него не было комнаты то не удаляем)
        if (indexRoomFrom !== -1) rooms.splice(indexRoomFrom, 1);
        // удалить комнату, куда чел пришел. там их уже двое
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
          currentPlayer: firstPlayer,
          firstPlayer: {
            isReady: false,
            playerId: firstPlayer,
            ships: [],
            battleField: new Array(10).fill(new Array<number>(10).fill(0)),
          },
          secondPlayer: {
            isReady: false,
            playerId: secondPlayer,
            ships: [],
            battleField: new Array(10).fill(new Array<number>(10).fill(0)),
          },
        });

        // отправить челам
        ws.send(JSON.stringify( createGame(gameId, firstPlayer) ));
        for (const [w, player] of users.entries())
          if (player.index === secondPlayer )
            w.send(JSON.stringify( createGame(gameId, secondPlayer ) ));

        break;
      //-----------------------------------------------------
      case 'add_ships':
        gameId = JSON.parse(parsedMessage.data).gameId;
        index = JSON.parse(parsedMessage.data).indexPlayer; // index игрока, string
        
        if ( index === users.get(ws).index) {
          // записать готовность чела играть
          game = games.get(gameId);
          if (game.firstPlayer.playerId === index) {
            game.firstPlayer.isReady = true;
            for ( const ship of JSON.parse(parsedMessage.data).ships)
              game.firstPlayer.ships.push(ship);
          } else {
            game.secondPlayer.isReady = true;
            for ( const ship of JSON.parse(parsedMessage.data).ships)
              game.secondPlayer.ships.push(ship);
          }

          games.set(gameId, game);

          // если все готовы, начинаем
          if (games.get(gameId).firstPlayer.isReady && games.get(gameId).secondPlayer.isReady ) {
            // сначала отправляет корабли первый игрок
            for (const [w, player] of users.entries())
              if (player.index === game.firstPlayer.playerId ) {
                w.send(JSON.stringify({
                  type: "start_game",
                  data: JSON.stringify({
                    ships: game.firstPlayer.ships,
                    currentPlayerIndex: game.firstPlayer.playerId,
                  }),
                  id: 0,
                }));

                // ход тоже будет его
                w.send(JSON.stringify({
                  type: "turn",
                  data: JSON.stringify({
                    currentPlayerIndex: game.firstPlayer.playerId,
                  }),
                  id: 0,
                }));
              }
            // корабли отправляет второй игрок
            for (const [w, player] of users.entries())
              if (player.index === game.secondPlayer.playerId ) {
                w.send(JSON.stringify({
                  type: "start_game",
                  data: JSON.stringify({
                    ships: game.secondPlayer.ships,
                    currentPlayerIndex: game.secondPlayer.playerId,
                  }),
                  id: 0,
                }));

                // ход будет соперника
                // w.send(JSON.stringify({
                //   type: "turn",
                //   data: JSON.stringify({
                //     currentPlayerIndex: game.secondPlayer.playerId,
                //   }),
                //   id: 0,
                // }));
              }

            // заполнить поля игроков
            startGame(gameId);
          }
        }
        break;
      //-----------------------------------------------------
      case 'attack':
        gameId = JSON.parse(parsedMessage.data).gameId;
        index = JSON.parse(parsedMessage.data).indexPlayer; // index игрока, string
        
        game = games.get(gameId);

        enemyId = game.firstPlayer.playerId === index ?
          game.secondPlayer.playerId :
          game.firstPlayer.playerId;

        if ( index === users.get(ws).index) {
          ws.send(JSON.stringify({
            type: "turn",
            data: JSON.stringify({
              currentPlayerIndex: index,
            }),
            id: 0,
          }));

          switch ( attack(gameId, index, JSON.parse(parsedMessage.data).x, JSON.parse(parsedMessage.data).y)) {
            case 'miss':
              ws.send(JSON.stringify({
                type: "attack",
                data: JSON.stringify({
                  position: {
                      x: JSON.parse(parsedMessage.data).x,
                      y: JSON.parse(parsedMessage.data).y,
                  },
                  currentPlayer: index,
                  status: "miss",
                }),
                id: 0,
              }));
              // передать ход противнику
              ws.send(JSON.stringify({
                type: "turn",
                data: JSON.stringify({
                  // currentPlayerIndex: index,
                  currentPlayerIndex: enemyId,
                }),
                id: 0,
              }));

              game.currentPlayer = enemyId;

              break;
            case 'shot':
              ws.send(JSON.stringify({
                type: "attack",
                data: JSON.stringify({
                  position: {
                      x: JSON.parse(parsedMessage.data).x,
                      y: JSON.parse(parsedMessage.data).y,
                  },
                  currentPlayer: index,
                  status: "shot",
                }),
                id: 0,
              }));
              // стрелять еще раз
              ws.send(JSON.stringify({
                type: "turn",
                data: JSON.stringify({
                  // currentPlayerIndex: enemyId,
                  currentPlayerIndex: index,
                }),
                id: 0,
              }));
              break;
            case null:
              break;
            default:
              break;
          }
        }
        break;
      //-------------------------------------------------------------
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
