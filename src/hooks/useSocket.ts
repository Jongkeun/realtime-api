import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents, ConnectionState } from '@/types/socket'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    roomId: null,
    role: null,
    remoteSocketId: null
  })

  useEffect(() => {
    const socket: TypedSocket = io()
    socketRef.current = socket

    socket.on('connect', () => {
      setConnectionState(prev => ({
        ...prev,
        isConnected: true
      }))
      console.log('Socket 연결 성공:', socket.id)
    })

    socket.on('disconnect', () => {
      setConnectionState(prev => ({
        ...prev,
        isConnected: false
      }))
      console.log('Socket 연결 해제')
    })

    socket.on('user-joined', (socketId: string) => {
      setConnectionState(prev => ({
        ...prev,
        remoteSocketId: socketId
      }))
      console.log('사용자 참여:', socketId)
    })

    socket.on('user-left', (socketId: string) => {
      setConnectionState(prev => ({
        ...prev,
        remoteSocketId: null
      }))
      console.log('사용자 퇴장:', socketId)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const createRoom = (callback: (roomId: string) => void) => {
    if (!socketRef.current) return

    socketRef.current.emit('create-room', ({ roomId }) => {
      setConnectionState(prev => ({
        ...prev,
        roomId,
        role: 'host'
      }))
      callback(roomId)
    })
  }

  const joinRoom = (roomId: string, callback: (success: boolean, error?: string) => void) => {
    if (!socketRef.current) return

    socketRef.current.emit('join-room', roomId, (response) => {
      if (response.success) {
        setConnectionState(prev => ({
          ...prev,
          roomId,
          role: 'guest'
        }))
        callback(true)
      } else {
        callback(false, response.error)
      }
    })
  }

  return {
    socket: socketRef.current,
    connectionState,
    createRoom,
    joinRoom
  }
}