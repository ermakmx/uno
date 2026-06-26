import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { io as ioc, Socket } from 'socket.io-client'
import { createServer, Server as HttpServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import cors from 'cors'
import { RoomManager } from '../src/RoomManager.js'

let httpServer: HttpServer
let ioServer: Server
let port: number

beforeAll(async () => {
  const app = express()
  app.use(cors())
  httpServer = createServer(app)
  ioServer = new Server(httpServer, { cors: { origin: '*' } })
  const roomManager = new RoomManager()

  ioServer.on('connection', (socket) => {
    socket.on('room:create', (playerName: string) => {
      const room = roomManager.createRoom()
      room.addPlayer(socket.id, playerName ?? 'Player')
      socket.join(room.code)
      socket.data.roomCode = room.code
      socket.data.playerId = socket.id
      socket.emit('room:created', { code: room.code })
      ioServer.to(room.code).emit('room:state', { players: room.getPublicPlayers() })
      console.log(`Server: room ${room.code} created for ${playerName}`)
    })

    socket.on('room:join', ({ code, name }: { code: string; name?: string }, cb?: (err?: string) => void) => {
      const room = roomManager.getRoom(code)
      if (!room) { cb?.('Room not found'); return }
      room.addPlayer(socket.id, name ?? 'Player')
      socket.join(code)
      socket.data.roomCode = code
      socket.data.playerId = socket.id
      ioServer.to(code).emit('room:state', { players: room.getPublicPlayers() })
      cb?.()
      console.log(`Server: ${name} joined room ${code}`)
    })

    socket.on('game:start', () => {
      const room = roomManager.getRoom(socket.data.roomCode)
      if (!room) return
      const result = room.startGame()
      if (!result.success) return
      ioServer.to(room.code).emit('game:started', result.payload!)
      broadcast(room.code, room)
      console.log(`Server: game started in room ${room.code}`)
    })

    socket.on('game:play', ({ cardIndex, chosenColor }: { cardIndex: number; chosenColor?: string }) => {
      const room = roomManager.getRoom(socket.data.roomCode)
      if (!room) return
      const result = room.playCard(socket.data.playerId, cardIndex, chosenColor)
      if (!result.success) { socket.emit('game:invalid', { reason: result.error }); return }
      broadcast(room.code, room)
      if (result.gameEnded) {
        ioServer.to(room.code).emit('game:ended', { winnerId: result.winnerId, winnerName: result.winnerName })
      }
    })

    socket.on('game:draw', () => {
      const room = roomManager.getRoom(socket.data.roomCode)
      if (!room) return
      const result = room.drawCard(socket.data.playerId)
      if (!result.success) { socket.emit('game:invalid', { reason: result.error }); return }
      broadcast(room.code, room)
      console.log(`Server: ${socket.id} drew a card`)
    })

    socket.on('game:pass_draw', () => {
      const room = roomManager.getRoom(socket.data.roomCode)
      if (!room) return
      const result = room.passDraw(socket.data.playerId)
      if (!result.success) { socket.emit('game:invalid', { reason: result.error }); return }
      broadcast(room.code, room)
    })
  })

  function broadcast(roomCode: string, room: any) {
    const payload = room.getStatePayload()
    for (const pid of room.getConnectedPlayerIds()) {
      ioServer.to(pid).emit('game:state', { ...payload, hand: room.getPlayerHand(pid) })
    }
  }

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      port = (httpServer.address() as any).port
      resolve()
    })
  })
})

afterAll(() => {
  ioServer.close()
  httpServer.close()
})

describe('full game flow', () => {
  it('two players play until someone wins', async () => {
    const errors1: string[] = []
    const errors2: string[] = []
    const states1: any[] = []
    const states2: any[] = []

    const p1 = ioc(`http://localhost:${port}`, { transports: ['websocket'] })
    const p2 = ioc(`http://localhost:${port}`, { transports: ['websocket'] })

    await Promise.all([
      new Promise<void>((r) => p1.on('connect', () => r())),
      new Promise<void>((r) => p2.on('connect', () => r())),
    ])

    p1.on('game:invalid', (d: any) => errors1.push(d.reason))
    p2.on('game:invalid', (d: any) => errors2.push(d.reason))
    p1.on('game:state', (d: any) => states1.push(d))
    p2.on('game:state', (d: any) => states2.push(d))

    const onEvent = (socket: Socket, event: string, timeout = 4000) =>
      new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), timeout)
        socket.once(event, (d: any) => { clearTimeout(timer); resolve(d) })
      })

    // Alice creates room
    p1.emit('room:create', 'Alice')
    const created = await onEvent(p1, 'room:created')
    expect(created.code.length).toBe(6)
    const code = created.code
    await onEvent(p1, 'room:state')

    // Bob joins
    p2.emit('room:join', { code, name: 'Bob' })
    await onEvent(p2, 'room:state')

    // Start game
    p1.emit('game:start')
    await onEvent(p1, 'game:started')
    await onEvent(p2, 'game:state')

    // Simple alternating draw
    const maxTurns = 60
    for (let i = 0; i < maxTurns; i++) {
      p1.emit('game:draw')
      const s1 = await onEvent(p1, 'game:state')
      if (s1.winnerId) { expect(s1.winnerId).toBe(p1.id); break }

      // p1 tries to play first matching card
      const hand1: any[] = s1.hand
      let played1 = false
      for (let j = 0; j < hand1.length; j++) {
        const c = hand1[j]
        if (c.color === s1.activeColor || c.color === 'wild') {
          p1.emit('game:play', { cardIndex: j, chosenColor: c.color === 'wild' ? 'red' : undefined })
          const r = await onEvent(p1, 'game:state')
          if (r.winnerId) { played1 = true; break }
          // Also consume p2's state from broadcast
          if (states2.length > 0) states2.shift()
          else { const t = setTimeout(() => {}, 100); p2.once('game:state', () => { clearTimeout(t) }) }
          played1 = true
          break
        }
      }
      if (played1) {
        // p1 played, p2 receives state
        // Now p2's turn
        p2.emit('game:draw')
        const s2 = await onEvent(p2, 'game:state')
        if (s2.winnerId) { expect(s2.winnerId).toBe(p2.id); break }

        const hand2: any[] = s2.hand
        let played2 = false
        for (let j = 0; j < hand2.length; j++) {
          const c = hand2[j]
          if (c.color === s2.activeColor || c.color === 'wild') {
            p2.emit('game:play', { cardIndex: j, chosenColor: c.color === 'wild' ? 'red' : undefined })
            const r = await onEvent(p2, 'game:state')
            if (r.winnerId) { played2 = true; break }
            if (states1.length > 0) states1.shift()
            else { const t = setTimeout(() => {}, 100); p1.once('game:state', () => { clearTimeout(t) }) }
            played2 = true
            break
          }
        }
        if (!played2) {
          p2.emit('game:pass_draw')
          await onEvent(p2, 'game:state')
          if (states1.length > 0) states1.shift()
          else { const t = setTimeout(() => {}, 100); p1.once('game:state', () => { clearTimeout(t) }) }
        }
        continue
      }

      // p1 couldn't play
      p1.emit('game:pass_draw')
      await onEvent(p1, 'game:state')

      // Check p2's state from the broadcast
      if (states2.length > 0) states2.shift()
      else { const t = setTimeout(() => {}, 100); p2.once('game:state', () => { clearTimeout(t) }) }

      // p2's turn
      p2.emit('game:draw')
      const s2 = await onEvent(p2, 'game:state')
      if (s2.winnerId) { expect(s2.winnerId).toBe(p2.id); break }

      const hand2: any[] = s2.hand
      let played2 = false
      for (let j = 0; j < hand2.length; j++) {
        const c = hand2[j]
        if (c.color === s2.activeColor || c.color === 'wild') {
          p2.emit('game:play', { cardIndex: j, chosenColor: c.color === 'wild' ? 'red' : undefined })
          const r = await onEvent(p2, 'game:state')
          if (r.winnerId) { played2 = true; break }
          if (states1.length > 0) states1.shift()
          else { const t = setTimeout(() => {}, 100); p1.once('game:state', () => { clearTimeout(t) }) }
          played2 = true
          break
        }
      }
      if (!played2) {
        p2.emit('game:pass_draw')
        await onEvent(p2, 'game:state')
        if (states1.length > 0) states1.shift()
        else { const t = setTimeout(() => {}, 100); p1.once('game:state', () => { clearTimeout(t) }) }
      }
    }

    expect(errors1).toHaveLength(0)
    expect(errors2).toHaveLength(0)

    p1.close()
    p2.close()
  }, 30000)
})
