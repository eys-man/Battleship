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

export interface Attack {
  position: {
      x: number,
      y: number,
  },
  currentPlayer: string,
  status: 'miss' | 'killed' | 'shot',
}

export interface Game {
  currentPlayer: string,
  firstPlayer: {
    isReady: boolean,
    playerId: string,
    ships: Ship[],
    battleField: number[][],
  }
  secondPlayer: {
    isReady: boolean,
    playerId: string,
    ships: Ship[],
    battleField: number[][],
  }
}

export const rooms: Room[] = [];
export const players: Player[] = [];
export const users = new Map();
export const games = new Map();
