import { io, Socket } from 'socket.io-client'

let url = import.meta.env.VITE_SERVER_URL as string | undefined
if (url && !url.startsWith('http')) {
  url = 'https://' + url
}
let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(url)
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
