import { GameRoom } from './GameRoom.js'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>()

  createRoom(isPublic = false): GameRoom {
    let code: string
    do {
      code = generateCode()
    } while (this.rooms.has(code))

    const room = new GameRoom(code, isPublic)
    this.rooms.set(code, room)
    return room
  }

  getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code)
  }

  getPublicRooms(): { code: string; hostName: string; playerCount: number }[] {
    const result: { code: string; hostName: string; playerCount: number }[] = []
    for (const room of this.rooms.values()) {
      const info = room.getRoomInfo()
      if (info) result.push(info)
    }
    return result
  }
}
