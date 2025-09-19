export interface ServerToClientEvents {
  'user-joined': (socketId: string) => void
  'user-left': (socketId: string) => void
  'offer': (offer: RTCSessionDescriptionInit, fromSocketId: string) => void
  'answer': (answer: RTCSessionDescriptionInit, fromSocketId: string) => void
  'ice-candidate': (candidate: RTCIceCandidate, fromSocketId: string) => void
}

export interface ClientToServerEvents {
  'create-room': (callback: (response: { roomId: string }) => void) => void
  'join-room': (roomId: string, callback: (response: { success?: boolean; error?: string }) => void) => void
  'offer': (offer: RTCSessionDescriptionInit, targetSocketId: string) => void
  'answer': (answer: RTCSessionDescriptionInit, targetSocketId: string) => void
  'ice-candidate': (candidate: RTCIceCandidate, targetSocketId: string) => void
}

export type UserRole = 'host' | 'guest'

export interface ConnectionState {
  isConnected: boolean
  roomId: string | null
  role: UserRole | null
  remoteSocketId: string | null
}