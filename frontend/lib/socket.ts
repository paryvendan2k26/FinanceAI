// lib/socket.ts
import { io, Socket } from 'socket.io-client'

class SocketManager {
  private socket: Socket | null = null

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(process.env.WEBSOCKET_URL || 'http://localhost:5000', {
        transports: ['websocket'],
        autoConnect: true,
      })
    }
    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }
}

export const socketManager = new SocketManager()
