import { v4 } from 'uuid';

export interface Player {
  index?: string;
  name: string;
  password: string;
  wins?: number;
}

/*export interface RegistrationRequest {
  type: "reg",
  data: {
    name: string,
    password: string,
  },
  id: 0,
}

export interface RegistrationResponse {
  type: "reg",
  data: {
    name: string,
    index: number | string,
    error: boolean,
    errorText: string,
  },
  id: 0,
}*/

export const players: Player[] = [];

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
  };

  console.log(`возвращаю: ${data}`);

  return {
    type: 'reg',
    data: JSON.stringify(data),
    id: 0
  };
}