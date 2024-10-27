import { v4 } from 'uuid';
import { rooms } from './db';

//------ создать комнату ---------------
export function createRoom(): void {
  const newRoomId = v4();
  rooms.push({ roomId: newRoomId, roomUsers: []});
}
