import { players } from './db';

export function updateWinners() {
  // создать список победителей
  const winners: { name: string; wins: number }[] = [];

  for (let i = 0; i < players.length; i++)
    winners.push({ name: players[i].name, wins: players[i].wins as number });

  // отсортировать массив победителей
  winners.sort((a, b) => {
    if (a.wins > b.wins) return 1;
    else if (a.wins < b.wins) return -1;
    return 0;
  });

  return {
    type: 'update_winners',
    data: JSON.stringify(winners),
    id: 0,
  };
}
