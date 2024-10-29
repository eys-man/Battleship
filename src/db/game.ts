export function createGame(idGame: string, idPlayer: string) {
  return {
    type: "create_game", //send for both players in the room, after they are connected to the room
    data: JSON.stringify(
        {
            idGame,  
            idPlayer, // generated by server id for player in the game session, not enemy (unique id for every player)
        }),
    id: 0,
  }
}