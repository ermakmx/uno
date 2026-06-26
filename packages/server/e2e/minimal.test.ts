import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { io as ioc } from 'socket.io-client'
import { createServer, Server as HttpServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import cors from 'cors'

let httpServer: HttpServer
let ioServer: Server
let port: number

beforeAll(async () => {
  const app = express()
  app.use(cors())
  httpServer = createServer(app)
  ioServer = new Server(httpServer, { cors: { origin: '*' } })

  ioServer.on('connection', (socket) => {
    socket.on('ping', (msg: string, cb: (resp: string) => void) => {
      cb(`pong:${msg}`)
    })

    socket.on('echo', (data: any) => {
      socket.emit('echoed', data)
    })

    socket.on('broadcast', (data: any) => {
      ioServer.to(socket.data.room).emit('broadcasted', data)
    })

    socket.on('join', (room: string) => {
      socket.join(room)
      socket.data.room = room
    })
  })

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

describe('socket.io connectivity', () => {
  it('can send and receive events', async () => {
    const client = ioc(`http://localhost:${port}`, { transports: ['websocket'] })
    await new Promise<void>((resolve) => client.on('connect', () => resolve()))

    const resp = await new Promise<string>((resolve) => {
      client.emit('ping', 'hello', (r: string) => resolve(r))
    })
    expect(resp).toBe('pong:hello')
    client.close()
  })

  it('can send to a specific socket', async () => {
    const c1 = ioc(`http://localhost:${port}`, { transports: ['websocket'] })
    const c2 = ioc(`http://localhost:${port}`, { transports: ['websocket'] })
    await Promise.all([
      new Promise<void>((r) => c1.on('connect', () => r())),
      new Promise<void>((r) => c2.on('connect', () => r())),
    ])

    // c1 joins room "test"
    await new Promise<void>((resolve) => c1.emit('join', 'test', resolve))

    // c1 sends echo to itself
    const echoed = new Promise<any>((resolve) => c1.once('echoed', resolve))
    c1.emit('echo', { msg: 'hello' })
    expect(await echoed).toEqual({ msg: 'hello' })

    // c1 broadcasts to room "test" - only c1 should get it
    const broadcasted = new Promise<any>((resolve) => c1.once('broadcasted', resolve))
    c1.emit('broadcast', { room: 'test', value: 42 })
    expect(await broadcasted).toEqual({ room: 'test', value: 42 })

    c1.close()
    c2.close()
  })
})
