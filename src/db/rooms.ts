import { rooms } from './db';

export function updateRoom() {
  return {
    type: 'update_room',
    data: JSON.stringify(rooms),
    id: 0,
  };
}
