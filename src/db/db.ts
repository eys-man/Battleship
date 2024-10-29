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

export const rooms: Room[] = [];
export const players: Player[] = [];
export const users = new Map();
