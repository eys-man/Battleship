export interface Player {
  index?: string;
  name: string;
  password?: string;
  wins?: number;
}

export interface Room {
  roomId?: string;
  roomUsers: Player[];
}

export const rooms: Room[] = [];
export const players: Player[] = [];

export const currentPlayer: Player = {
  index: '',
  name: '',
  password: '',
  wins: -1,
};

export const currentRoom = { id: '', host: '' };
