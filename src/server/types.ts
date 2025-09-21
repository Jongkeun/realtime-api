import type { Server } from "socket.io";
import type WebSocket from "ws";

export interface SocketData {
  role?: "host" | "guest";
  roomId?: string;
  openaiWs?: WebSocket;
  hostName?: string;
}

export interface RoomInfo {
  roomId: string;
  hostSocketId: string;
  hostName: string;
  guestCount: number;
  maxGuests: number;
  createdAt: Date;
}

export interface ServerToClientEvents {
  "openai-connected": () => void;
  "openai-disconnected": () => void;
  "openai-error": (error: string) => void;
  "openai-message": (message: OpenAIMessage) => void;
  "user-joined": (socketId: string) => void;
  "user-left": (socketId: string) => void;
  "room-list-updated": (rooms: RoomInfo[]) => void;
  offer: (offer: RTCSessionDescriptionInit, socketId: string) => void;
  answer: (answer: RTCSessionDescriptionInit, socketId: string) => void;
  "ice-candidate": (candidate: RTCIceCandidate, socketId: string) => void;
}

export interface ClientToServerEvents {
  "create-room": (hostName: string, callback: (response: { roomId: string }) => void) => void;
  "join-room": (roomId: string, callback: (response: { success?: boolean; error?: string }) => void) => void;
  "get-room-list": (callback: (response: { rooms: RoomInfo[] }) => void) => void;
  "connect-openai": (callback: (response: { success?: boolean; error?: string }) => void) => void;
  "disconnect-openai": () => void;
  "send-openai-message": (message: OpenAIMessage) => void;
  offer: (offer: RTCSessionDescriptionInit, targetSocketId: string) => void;
  answer: (answer: RTCSessionDescriptionInit, targetSocketId: string) => void;
  "ice-candidate": (candidate: RTCIceCandidate, targetSocketId: string) => void;
}

export interface OpenAIMessage {
  type: string;
  [key: string]: unknown;
}

export type SocketIOServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;