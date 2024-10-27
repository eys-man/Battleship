import { v4 } from 'uuid';
import { players, currentPlayer } from './db';

export function handlePlayer(message: string): {type: string, data: string, id: number}  {
  // разобрать строку
  console.log(`message: ${message}`);
  const parsedMessage = JSON.parse(message);
  const newPlayer = JSON.parse(parsedMessage.data);

  // это будет отправляться клиенту
  const data = {
    name: ``,
    index: ``,
    error: false,
    errorText: ``,
  };

  console.log(`newPlayer: name=${newPlayer.name}, password=${newPlayer.password}`);
  // проверить на существование в базе
  let i = players.findIndex((player) => player.name === newPlayer.name)
  if (i !== -1 ) { // если нашли в базе с таким именем
    if (newPlayer.password === players[i].password) {
      // подготовить данные для выдачи клиенту
      data.index = players[i].index as string;
      data.name = players[i].name;

      // сделать текущим игроком
      currentPlayer.index = players[i].index;
      currentPlayer.name = players[i].name;
      currentPlayer.wins = players[i].wins;
      currentPlayer.password = players[i].password;
    } else {
      data.error = true;
      data.errorText = `Password no valid!`;
    }
  } else {
    // внести в базу нового игрока
    players.push({
      index: v4(),
      name: newPlayer.name,
      password: newPlayer.password,
      wins: 0,
    }); 

    i = players.length - 1; // его индекс в массиве (базе игроков)

    data.index = players[i].index as string;
    data.name = players[i].name;

    // сделать текущим игроком
    currentPlayer.index = players[i].index;
    currentPlayer.name = players[i].name;
    currentPlayer.wins = players[i].wins;
    currentPlayer.password = players[i].password;
  };

  console.log(`возвращаю: ${data}`);

  return {
    type: 'reg',
    data: JSON.stringify(data),
    id: 0
  };
}

export function updateWinners() {
  // создать список победителей
  const winners: { name: string, wins: number }[] = [];
  
  for(let i = 0; i < players.length; i++)
    winners.push({ name: players[i].name, wins: players[i].wins as number });

  // отсортировать массив победителей
  winners.sort((a, b) => {
    if(a.wins > b.wins) return 1;
    else if(a.wins < b.wins) return -1;
    return 0;
  });

  return {
    type: 'update_winners',
    data: JSON.stringify(winners),
    id:0,
  };
}