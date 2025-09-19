export interface RoomInfo {
  roomId: string;
  hostSocketId: string;
  hostName: string;
  guestCount: number;
  maxGuests: number;
  createdAt: Date;
}

export interface ServerToClientEvents {
  'user-joined': (socketId: string) => void
  'user-left': (socketId: string) => void
  'room-list-updated': (rooms: RoomInfo[]) => void
  'offer': (offer: RTCSessionDescriptionInit, fromSocketId: string) => void
  'answer': (answer: RTCSessionDescriptionInit, fromSocketId: string) => void
  'ice-candidate': (candidate: RTCIceCandidate, fromSocketId: string) => void
}

export interface ClientToServerEvents {
  'create-room': (hostName: string, callback: (response: { roomId: string }) => void) => void
  'join-room': (roomId: string, callback: (response: { success?: boolean; error?: string }) => void) => void
  'get-room-list': (callback: (response: { rooms: RoomInfo[] }) => void) => void
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