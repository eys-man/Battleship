import { randomUUID } from 'crypto';
import { currentPlayer, currentRoom, rooms } from './db';

//------ создать комнату ---------------
export function createRoom(): void {
  const newRoomId = randomUUID();
  rooms.push({ roomId: newRoomId, roomUsers: []});
  rooms[rooms.length -1].roomUsers.push({
    name: currentPlayer.name,
    index: currentPlayer.index,
  });

  currentRoom.host = currentPlayer.index as string; // хозяин комнаты
  currentRoom.id = currentPlayer.index as string; // индекс комнаты, где чел хозяин

  console.log(`созданная комната: id = ${newRoomId}\n host: name = ${currentPlayer.name}, index = ${currentPlayer.index}`);
}

export function addToRoom(indexRoom: string) {
  // удалить комнату, куда пришел
  // const indexWhere = rooms.findIndex((i) => i.roomId === indexRoom);
  // console.log(`add to room ${indexWhere}`);
  // rooms.splice(indexWhere, 1);
  
  // удалить комнату, откуда пришел (собственную, когда зарегался)

  const indexFrom = rooms.findIndex((i) => i.roomId === currentRoom.id);
  console.log(`add to room ${indexFrom}`);
  rooms.splice(indexFrom, 1);

  currentRoom.id = indexRoom;
}

export function updateRoom() {
  return {
    type: 'update_room',
    data: JSON.stringify(rooms),
    id: 0,
  }
}