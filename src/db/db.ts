import { WebSocket } from 'ws';

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

export interface User {
  ws: WebSocket;
  player?: Player;
}

export interface Ship {
  position: {
    x: number,
    y: number,
  },
  direction: boolean,
  length: number,
  type: 'small' | 'medium' | 'large' | 'huge',
}

export interface Game {
  // gameId: string,
  firstPlayer: {
    isReady: boolean,
    playerId: string,
  }
  secondPlayer: {
    isReady: boolean,
    playerId: string,
  }
}

export const rooms: Room[] = [];
export const players: Player[] = [];
export const users = new Map();
export const ships: Ship[] = [];
export const games = new Map();

// заполнить нулями массив (типа не плавает еще никто)
export const gameBoard = new Array(10).fill(new Array(10).fill(0));
