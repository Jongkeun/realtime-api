import type { Socket } from "socket.io";
import { OpenAIRealtimeConnection } from "./openai-connection";
import { RoomManager } from "./room-manager";
import type { SocketData, ClientToServerEvents, ServerToClientEvents, SocketIOServer, OpenAIMessage } from "./types";

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export class SocketEventHandlers {
  private roomManager: RoomManager;
  private openaiConnections = new Map<string, OpenAIRealtimeConnection>();
  private apiKey: string;
  private io: SocketIOServer;

  constructor(roomManager: RoomManager, apiKey: string, io: SocketIOServer) {
    this.roomManager = roomManager;
    this.apiKey = apiKey;
    this.io = io;
  }

  handleConnection(socket: SocketType) {
    console.log("클라이언트 연결:", socket.id);

    this.setupRoomEventHandlers(socket);
    this.setupWebRTCEventHandlers(socket);
    this.setupOpenAIEventHandlers(socket);
    this.setupDisconnectionHandler(socket);
  }

  private setupRoomEventHandlers(socket: SocketType) {
    // 방 목록 요청
    socket.on("get-room-list", (callback) => {
      if (!this.isValidCallback(callback, "get-room-list")) return;

      const rooms = this.roomManager.getRoomList();
      callback({ rooms });
    });

    // 룸 생성
    socket.on("create-room", (hostName: string, callback) => {
      if (!this.isValidCallback(callback, "create-room")) return;

      const roomId = this.roomManager.createRoom(socket.id, hostName);
      
      socket.join(roomId);
      socket.data.role = "host";
      socket.data.roomId = roomId;
      socket.data.hostName = hostName;

      callback({ roomId });
    });

    // 룸 참여
    socket.on("join-room", (roomId: string, callback) => {
      const result = this.roomManager.joinRoom(roomId, socket.id);
      
      if (result.success) {
        socket.join(roomId);
        socket.data.role = "guest";
        socket.data.roomId = roomId;
        socket.to(roomId).emit("user-joined", socket.id);
      }

      callback(result);
    });
  }

  private setupWebRTCEventHandlers(socket: SocketType) {
    // WebRTC 시그널링
    socket.on("offer", (offer: RTCSessionDescriptionInit, targetSocketId: string) => {
      console.log(`Offer 수신: ${socket.id} -> ${targetSocketId}`);
      socket.to(targetSocketId).emit("offer", offer, socket.id);
      console.log(`Offer 전송 완료: ${socket.id} -> ${targetSocketId}`);
    });

    socket.on("answer", (answer: RTCSessionDescriptionInit, targetSocketId: string) => {
      console.log(`Answer 수신: ${socket.id} -> ${targetSocketId}`);
      socket.to(targetSocketId).emit("answer", answer, socket.id);
      console.log(`Answer 전송 완료: ${socket.id} -> ${targetSocketId}`);
    });

    socket.on("ice-candidate", (candidate: RTCIceCandidate, targetSocketId: string) => {
      socket.to(targetSocketId).emit("ice-candidate", candidate, socket.id);
      console.log("ICE candidate 전송");
    });
  }

  private setupOpenAIEventHandlers(socket: SocketType) {
    // OpenAI Realtime API 연결 요청
    socket.on("connect-openai", async (callback) => {
      try {
        const openaiConnection = new OpenAIRealtimeConnection(socket.id, this.apiKey);
        await openaiConnection.connect(this.io);
        
        this.openaiConnections.set(socket.id, openaiConnection);
        callback({ success: true });
        console.log(`OpenAI 연결 성공: ${socket.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "연결 실패";
        callback({ error: errorMessage });
        console.error(`OpenAI 연결 실패: ${socket.id}`, error);
      }
    });

    // OpenAI로 메시지 전송
    socket.on("send-openai-message", (message: OpenAIMessage) => {
      const openaiConnection = this.openaiConnections.get(socket.id);
      
      if (openaiConnection?.isConnected) {
        openaiConnection.sendMessage(message);
      } else {
        socket.emit("openai-error", "OpenAI에 연결되어 있지 않습니다");
      }
    });

    // OpenAI 연결 해제 요청
    socket.on("disconnect-openai", () => {
      const openaiConnection = this.openaiConnections.get(socket.id);
      
      if (openaiConnection) {
        openaiConnection.disconnect();
        this.openaiConnections.delete(socket.id);
        socket.emit("openai-disconnected");
      }
    });
  }

  private setupDisconnectionHandler(socket: SocketType) {
    socket.on("disconnect", () => {
      console.log("클라이언트 연결 해제:", socket.id);

      // OpenAI 연결 해제
      this.cleanupOpenAIConnection(socket.id);

      // 룸 관련 정리
      this.cleanupRoomConnection(socket);
    });
  }

  private cleanupOpenAIConnection(socketId: string) {
    const openaiConnection = this.openaiConnections.get(socketId);
    if (openaiConnection) {
      openaiConnection.disconnect();
      this.openaiConnections.delete(socketId);
    }
  }

  private cleanupRoomConnection(socket: SocketType) {
    if (!socket.data.roomId) return;

    socket.to(socket.data.roomId).emit("user-left", socket.id);

    if (socket.data.role === "host") {
      this.roomManager.deleteRoom(socket.data.roomId);
    } else if (socket.data.role === "guest") {
      this.roomManager.updateRoomInfo(socket.data.roomId);
    }
  }

  private isValidCallback<T>(
    callback: unknown, 
    eventName: string
  ): callback is (response: T) => void {
    console.log(`${eventName} 이벤트 수신, hasCallback:`, !!callback);
    
    if (typeof callback !== "function") {
      console.error(`${eventName} callback이 함수가 아님:`, typeof callback);
      return false;
    }
    
    return true;
  }
}