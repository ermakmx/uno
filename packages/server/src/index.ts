import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import cors from 'cors'
import { Color } from '@uno/shared'
import { RoomManager } from './RoomManager.js'
import { checkRateLimit } from './rateLimiter.js'

const PORT = process.env.PORT ?? 3000

const app = express()
app.use(cors())
app.get('/', (_req, res) => res.send('ok'))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 5000,
})

const roomManager = new RoomManager()

function validateName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim().slice(0, 20)
  if (trimmed.length < 1) return null
  if (/[<>]/.test(trimmed)) return null
  return trimmed
}

function validateCode(code: unknown): string | null {
  if (typeof code !== 'string') return null
  return code.trim().toUpperCase().slice(0, 6)
}

function getRoom(socket: import('socket.io').Socket) {
  const { roomCode } = socket.data
  if (!roomCode || typeof roomCode !== 'string') return null
  return roomManager.getRoom(roomCode) ?? null
}

function broadcastPublicRooms() {
  io.emit('room:list_updated', roomManager.getPublicRooms())
}

io.on('connection', (socket) => {
  socket.on('room:create', (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('game:invalid', { reason: 'Too many requests' })
      return
    }
    const payload = data as { name?: string; isPublic?: boolean } | undefined
    const name = validateName(payload?.name) ?? 'Player'
    const isPublic = payload?.isPublic === true
    const room = roomManager.createRoom(isPublic)
    room.addPlayer(socket.id, name)
    socket.join(room.code)
    socket.data.roomCode = room.code
    socket.data.playerId = socket.id
    socket.emit('room:created', { code: room.code })
    io.to(room.code).emit('room:state', { players: room.getPublicPlayers() })
    if (isPublic) broadcastPublicRooms()
  })

  socket.on('room:join', (data: unknown, callback?: (err?: string) => void) => {
    if (!checkRateLimit(socket.id)) {
      callback?.('Too many requests')
      return
    }
    const payload = data as { code?: string; name?: string } | undefined
    const code = validateCode(payload?.code)
    const name = validateName(payload?.name) ?? 'Player'
    if (!code) { callback?.('Invalid room code'); return }

    const room = roomManager.getRoom(code)
    if (!room) { callback?.('Room not found'); return }
    if (room.state.phase !== 'waiting') { callback?.('Game already started'); return }

    room.addPlayer(socket.id, name)
    socket.join(code)
    socket.data.roomCode = code
    socket.data.playerId = socket.id
    io.to(code).emit('room:state', { players: room.getPublicPlayers() })
    callback?.()
  })

  socket.on('room:list', (callback?: (rooms: { code: string; hostName: string; playerCount: number }[]) => void) => {
    callback?.(roomManager.getPublicRooms())
  })

  socket.on('game:start', () => {
    if (!checkRateLimit(socket.id)) { socket.emit('game:invalid', { reason: 'Too many requests' }); return }
    const room = getRoom(socket)
    if (!room) return
    const player = room.state.players.find(p => p.id === socket.id)
    if (!player || player !== room.state.players[0]) {
      socket.emit('game:invalid', { reason: 'Only host can start' })
      return
    }

    const result = room.startGame()
    if (!result.success) { socket.emit('game:invalid', { reason: result.error }); return }

    io.to(room.code).emit('game:started', result.payload!)
    broadcastGameState(room.code, room)
    if (room.isPublic) broadcastPublicRooms()
  })

  socket.on('game:play', (data: unknown) => {
    if (!checkRateLimit(socket.id)) { socket.emit('game:invalid', { reason: 'Too many requests' }); return }
    const room = getRoom(socket)
    if (!room) return

    const payload = data as { cardIndex?: number; chosenColor?: string } | undefined
    if (payload == null || typeof payload.cardIndex !== 'number' || payload.cardIndex < 0) {
      socket.emit('game:invalid', { reason: 'Invalid card index' })
      return
    }

    const validColors = [Color.Red, Color.Yellow, Color.Green, Color.Blue]
    const chosenColor = payload.chosenColor && validColors.includes(payload.chosenColor as Color)
      ? payload.chosenColor
      : undefined

    const result = room.playCard(socket.id, payload.cardIndex, chosenColor)
    if (!result.success) { socket.emit('game:invalid', { reason: result.error }); return }

    broadcastGameState(room.code, room)
    if (result.gameEnded) {
      io.to(room.code).emit('game:ended', { winnerId: result.winnerId, winnerName: result.winnerName })
    }
  })

  socket.on('game:draw', () => {
    if (!checkRateLimit(socket.id)) { socket.emit('game:invalid', { reason: 'Too many requests' }); return }
    const room = getRoom(socket)
    if (!room) return
    const result = room.drawCard(socket.id)
    if (!result.success) { socket.emit('game:invalid', { reason: result.error }); return }
    broadcastGameState(room.code, room)
    if (result.gameEnded) {
      io.to(room.code).emit('game:ended', { winnerId: result.winnerId, winnerName: result.winnerName })
    }
  })

  socket.on('game:pass_draw', () => {
    if (!checkRateLimit(socket.id)) { socket.emit('game:invalid', { reason: 'Too many requests' }); return }
    const room = getRoom(socket)
    if (!room) return
    const result = room.passDraw(socket.id)
    if (!result.success) { socket.emit('game:invalid', { reason: result.error }); return }
    broadcastGameState(room.code, room)
  })

  socket.on('game:say_uno', () => {
    if (!checkRateLimit(socket.id)) { socket.emit('game:invalid', { reason: 'Too many requests' }); return }
    const room = getRoom(socket)
    if (!room) return
    room.sayUno(socket.id)
    broadcastGameState(room.code, room)
  })

  socket.on('game:call_out', (data: unknown) => {
    if (!checkRateLimit(socket.id)) { socket.emit('game:invalid', { reason: 'Too many requests' }); return }
    const room = getRoom(socket)
    if (!room) return
    const payload = data as { targetId?: string } | undefined
    if (!payload?.targetId) { socket.emit('game:invalid', { reason: 'Invalid target' }); return }
    room.callOut(socket.id, payload.targetId)
    broadcastGameState(room.code, room)
  })

  socket.on('game:rematch', () => {
    const room = getRoom(socket)
    if (!room) return
    if (room.state.phase !== 'finished') return
    room.resetToLobby()
    io.to(room.code).emit('room:state', { players: room.getPublicPlayers() })
  })

  socket.on('disconnect', () => {
    const room = getRoom(socket)
    if (!room) return
    const wasPublic = room.isPublic
    room.disconnectPlayer(socket.id)
    io.to(room.code).emit('player:disconnected', { playerId: socket.id })
    broadcastGameState(room.code, room)
    if (wasPublic) broadcastPublicRooms()
  })
})

function broadcastGameState(roomCode: string, room: import('./GameRoom.js').GameRoom) {
  const payload = room.getStatePayload()
  for (const playerId of room.getConnectedPlayerIds()) {
    io.to(playerId).emit('game:state', { ...payload, hand: room.getPlayerHand(playerId) })
  }
}

httpServer.listen(PORT, () => {
  console.log(`UNO server running on port ${PORT}`)
})
