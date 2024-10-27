export interface Player {
  index?: string;
  name: string;
  password: string;
  wins?: number;
}

export interface Room {
  roomId?: string;
  roomUsers: Player[];
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

export const rooms: Room[] = [];
export const players: Player[] = [];

export const currentPlayer: Player = {
  index: '',
  name: '',
  password: '',
  wins: -1,
}
