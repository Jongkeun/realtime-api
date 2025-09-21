import WebSocket from "ws";
import { SYSTEM_PROMPT, VOICE_CONFIG } from "../../prompts/system";
import type { SocketIOServer, OpenAIMessage } from "./types";

export class OpenAIRealtimeConnection {
  private ws: WebSocket | null = null;
  private socketId: string;
  private apiKey: string;

  constructor(socketId: string, apiKey: string) {
    this.socketId = socketId;
    this.apiKey = apiKey;
  }

  async connect(io: SocketIOServer): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.apiKey) {
        const error = new Error("OpenAI API Key가 설정되지 않았습니다");
        console.error(error.message);
        reject(error);
        return;
      }

      try {
        this.ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "OpenAI-Beta": "realtime=v1",
          },
        });

        this.setupEventListeners(io, resolve, reject);
      } catch (error) {
        console.error("OpenAI 연결 실패:", error);
        reject(error);
      }
    });
  }

  private setupEventListeners(
    io: SocketIOServer,
    resolve: (value: boolean) => void,
    reject: (reason?: unknown) => void,
  ) {
    if (!this.ws) return;

    this.ws.on("open", () => {
      console.log("OpenAI Realtime API에 연결됨");

      this.sendSessionConfig();
      io.to(this.socketId).emit("openai-connected");
      resolve(true);
    });

    this.ws.on("message", (data) => {
      this.handleMessage(data, io);
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
  }

  private sendSessionConfig() {
    const sessionConfig = {
      type: "session.update",
      session: {
        instructions: SYSTEM_PROMPT,
        ...VOICE_CONFIG,
      },
    };

    this.ws?.send(JSON.stringify(sessionConfig));
  }

  private handleMessage(data: WebSocket.RawData, io: SocketIOServer) {
    try {
      const message = JSON.parse(data.toString());
      io.to(this.socketId).emit("openai-message", message);
    } catch (error) {
      console.error("OpenAI 메시지 파싱 오류:", error);
    }
  }

  sendMessage(message: OpenAIMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.logMessage(message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("OpenAI WebSocket이 연결되어 있지 않습니다");
    }
  }

  private logMessage(message: OpenAIMessage) {
    const messageTypeLogMap = {
      "input_audio_buffer.append": "📤 오디오 데이터 전송",
      "input_audio_buffer.commit": "📤 오디오 커밋 요청",
    };

    const logMessage = messageTypeLogMap[message.type as keyof typeof messageTypeLogMap] || "📤 메시지 전송";

    console.log(`${logMessage}:`, message.type);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
