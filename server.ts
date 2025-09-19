import { config } from "dotenv";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import WebSocket from "ws";

// 환경 변수 로드
config({ path: ".env.local" });

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
const SERVER_HOSTNAME = "localhost";
const SERVER_PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface SocketData {
  role?: "host" | "guest";
  roomId?: string;
  openaiWs?: WebSocket;
}

interface ServerToClientEvents {
  "openai-connected": () => void;
  "openai-disconnected": () => void;
  "openai-error": (error: string) => void;
  "openai-message": (message: OpenAIMessage) => void;
  "user-joined": (socketId: string) => void;
  "user-left": (socketId: string) => void;
  offer: (offer: RTCSessionDescriptionInit, socketId: string) => void;
  answer: (answer: RTCSessionDescriptionInit, socketId: string) => void;
  "ice-candidate": (candidate: RTCIceCandidate, socketId: string) => void;
}

interface ClientToServerEvents {
  "create-room": (callback: (response: { roomId: string }) => void) => void;
  "join-room": (roomId: string, callback: (response: { success?: boolean; error?: string }) => void) => void;
  "connect-openai": (callback: (response: { success?: boolean; error?: string }) => void) => void;
  "disconnect-openai": () => void;
  "send-openai-message": (message: OpenAIMessage) => void;
  offer: (offer: RTCSessionDescriptionInit, targetSocketId: string) => void;
  answer: (answer: RTCSessionDescriptionInit, targetSocketId: string) => void;
  "ice-candidate": (candidate: RTCIceCandidate, targetSocketId: string) => void;
}

interface OpenAIMessage {
  type: string;
  [key: string]: unknown;
}

class OpenAIRealtimeConnection {
  private ws: WebSocket | null = null;
  private socketId: string;

  constructor(socketId: string) {
    this.socketId = socketId;
  }

  connect(io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!OPENAI_API_KEY) {
        console.error("OpenAI API Key가 설정되지 않았습니다");
        reject(new Error("OpenAI API Key가 설정되지 않았습니다"));
        return;
      }

      try {
        this.ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "realtime=v1",
          },
        });

        this.ws.on("open", () => {
          console.log("OpenAI Realtime API에 연결됨");

          // 세션 설정
          const sessionConfig = {
            type: "session.update",
            session: {
              instructions: "당신은 도움이 되는 AI 어시스턴트입니다. 자연스럽고 친근하게 대화해주세요.",
              voice: "nova",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
          };

          this.ws?.send(JSON.stringify(sessionConfig));

          // 클라이언트에 연결 성공 알림
          io.to(this.socketId).emit("openai-connected");
          resolve(true);
        });

        this.ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log("OpenAI 메시지:", message.type);

            // 클라이언트에 메시지 전달
            io.to(this.socketId).emit("openai-message", message);
          } catch (error) {
            console.error("OpenAI 메시지 파싱 오류:", error);
          }
        });

        this.ws.on("error", (error) => {
          console.error("OpenAI WebSocket 오류:", error);
          io.to(this.socketId).emit("openai-error", "OpenAI 연결에 실패했습니다");
          reject(error);
        });

        this.ws.on("close", () => {
          console.log("OpenAI WebSocket 연결 종료");
          io.to(this.socketId).emit("openai-disconnected");
          this.ws = null;
        });
      } catch (error) {
        console.error("OpenAI 연결 실패:", error);
        reject(error);
      }
    });
  }

  sendMessage(message: OpenAIMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("OpenAI WebSocket이 연결되어 있지 않습니다");
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const app = next({
  dev: IS_DEVELOPMENT,
  hostname: SERVER_HOSTNAME,
  port: Number(SERVER_PORT),
});
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    if (!req.url) return;
    const parsedUrl = parse(req.url, true);
    handler(req, res, parsedUrl);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // 연결된 OpenAI 인스턴스들을 관리
  const openaiConnections = new Map<string, OpenAIRealtimeConnection>();

  // WebRTC 시그널링 및 OpenAI 처리
  io.on("connection", (socket) => {
    console.log("클라이언트 연결:", socket.id);

    // 룸 생성
    socket.on("create-room", (callback: (response: { roomId: string }) => void) => {
      const roomId = Math.random().toString(36).substring(7);
      socket.join(roomId);
      socket.data.role = "host";
      socket.data.roomId = roomId;
      callback({ roomId });
      console.log(`호스트가 룸 생성: ${roomId}`);
    });

    // 룸 참여
    socket.on("join-room", (roomId: string, callback: (response: { success?: boolean; error?: string }) => void) => {
      const room = io.sockets.adapter.rooms.get(roomId);

      if (!room) {
        callback({ error: "존재하지 않는 룸입니다" });
        return;
      }

      const MAXIMUM_ROOM_SIZE = 2;
      if (room.size >= MAXIMUM_ROOM_SIZE) {
        callback({ error: "룸이 가득찼습니다" });
        return;
      }

      socket.join(roomId);
      socket.data.role = "guest";
      socket.data.roomId = roomId;
      socket.to(roomId).emit("user-joined", socket.id);
      callback({ success: true });
      console.log(`게스트가 룸 참여: ${roomId}`);
    });

    // WebRTC 시그널링
    socket.on("offer", (offer: RTCSessionDescriptionInit, targetSocketId: string) => {
      socket.to(targetSocketId).emit("offer", offer, socket.id);
      console.log("Offer 전송");
    });

    socket.on("answer", (answer: RTCSessionDescriptionInit, targetSocketId: string) => {
      socket.to(targetSocketId).emit("answer", answer, socket.id);
      console.log("Answer 전송");
    });

    socket.on("ice-candidate", (candidate: RTCIceCandidate, targetSocketId: string) => {
      socket.to(targetSocketId).emit("ice-candidate", candidate, socket.id);
      console.log("ICE candidate 전송");
    });

    // OpenAI Realtime API 연결 요청
    socket.on("connect-openai", async (callback: (response: { success?: boolean; error?: string }) => void) => {
      try {
        const openaiConnection = new OpenAIRealtimeConnection(socket.id);
        await openaiConnection.connect(io);
        openaiConnections.set(socket.id, openaiConnection);
        callback({ success: true });
        console.log(`OpenAI 연결 성공: ${socket.id}`);
      } catch (error) {
        callback({ error: error instanceof Error ? error.message : "연결 실패" });
        console.error(`OpenAI 연결 실패: ${socket.id}`, error);
      }
    });

    // OpenAI로 메시지 전송
    socket.on("send-openai-message", (message: OpenAIMessage) => {
      const openaiConnection = openaiConnections.get(socket.id);
      if (openaiConnection) {
        openaiConnection.sendMessage(message);
      } else {
        socket.emit("openai-error", "OpenAI에 연결되어 있지 않습니다");
      }
    });

    // OpenAI 연결 해제 요청
    socket.on("disconnect-openai", () => {
      const openaiConnection = openaiConnections.get(socket.id);
      if (openaiConnection) {
        openaiConnection.disconnect();
        openaiConnections.delete(socket.id);
        socket.emit("openai-disconnected");
      }
    });

    // 연결 해제
    socket.on("disconnect", () => {
      console.log("클라이언트 연결 해제:", socket.id);

      // OpenAI 연결도 해제
      const openaiConnection = openaiConnections.get(socket.id);
      if (openaiConnection) {
        openaiConnection.disconnect();
        openaiConnections.delete(socket.id);
      }

      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit("user-left", socket.id);
      }
    });
  });

  httpServer
    .once("error", (err: Error) => {
      console.error(err);
      process.exit(1);
    })
    .listen(Number(SERVER_PORT), () => {
      console.log(`> Ready on http://${SERVER_HOSTNAME}:${SERVER_PORT}`);
    });
});
