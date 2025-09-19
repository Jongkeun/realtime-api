import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'

const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production'
const SERVER_HOSTNAME = 'localhost'
const SERVER_PORT = process.env.PORT || 3000

interface SocketData {
  role?: 'host' | 'guest'
  roomId?: string
}

const app = next({ 
  dev: IS_DEVELOPMENT, 
  hostname: SERVER_HOSTNAME, 
  port: Number(SERVER_PORT) 
})
const handler = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    if (!req.url) return
    const parsedUrl = parse(req.url, true)
    handler(req, res, parsedUrl)
  })

  const io = new Server<{}, {}, {}, SocketData>(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  // WebRTC 시그널링 처리
  io.on('connection', (socket) => {
    console.log('클라이언트 연결:', socket.id)

    // 룸 생성
    socket.on('create-room', (callback: (response: { roomId: string }) => void) => {
      const roomId = Math.random().toString(36).substring(7)
      socket.join(roomId)
      socket.data.role = 'host'
      socket.data.roomId = roomId
      callback({ roomId })
      console.log(`호스트가 룸 생성: ${roomId}`)
    })

    // 룸 참여
    socket.on('join-room', (
      roomId: string, 
      callback: (response: { success?: boolean; error?: string }) => void
    ) => {
      const room = io.sockets.adapter.rooms.get(roomId)
      
      if (!room) {
        callback({ error: '존재하지 않는 룸입니다' })
        return
      }

      const MAXIMUM_ROOM_SIZE = 2
      if (room.size >= MAXIMUM_ROOM_SIZE) {
        callback({ error: '룸이 가득찼습니다' })
        return
      }

      socket.join(roomId)
      socket.data.role = 'guest'
      socket.data.roomId = roomId
      socket.to(roomId).emit('user-joined', socket.id)
      callback({ success: true })
      console.log(`게스트가 룸 참여: ${roomId}`)
    })

    // WebRTC 시그널링
    socket.on('offer', (offer: RTCSessionDescriptionInit, targetSocketId: string) => {
      socket.to(targetSocketId).emit('offer', offer, socket.id)
      console.log('Offer 전송')
    })

    socket.on('answer', (answer: RTCSessionDescriptionInit, targetSocketId: string) => {
      socket.to(targetSocketId).emit('answer', answer, socket.id)
      console.log('Answer 전송')
    })

    socket.on('ice-candidate', (candidate: RTCIceCandidate, targetSocketId: string) => {
      socket.to(targetSocketId).emit('ice-candidate', candidate, socket.id)
      console.log('ICE candidate 전송')
    })

    // 연결 해제
    socket.on('disconnect', () => {
      console.log('클라이언트 연결 해제:', socket.id)
      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit('user-left', socket.id)
      }
    })
  })

  httpServer
    .once('error', (err: Error) => {
      console.error(err)
      process.exit(1)
    })
    .listen(Number(SERVER_PORT), () => {
      console.log(`> Ready on http://${SERVER_HOSTNAME}:${SERVER_PORT}`)
    })
})