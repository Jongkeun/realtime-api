import { config } from "dotenv";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { RoomManager } from "./src/server/room-manager";
import { SocketEventHandlers } from "./src/server/socket-handlers";
import type { SocketIOServer } from "./src/server/types";

// 환경 변수 로드
config({ path: ".env.local" });

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
const SERVER_PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = next({
  dev: IS_DEVELOPMENT,
});

const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    if (!req.url) return;
    const parsedUrl = parse(req.url, true);
    handler(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  }) as SocketIOServer;

  // 서비스 인스턴스 생성
  const roomManager = new RoomManager(io);
  const socketHandlers = new SocketEventHandlers(roomManager, OPENAI_API_KEY || "", io);

  // 소켓 연결 처리
  io.on("connection", (socket) => {
    socketHandlers.handleConnection(socket);
  });

  httpServer
    .once("error", (err: Error) => {
      console.error(err);
      process.exit(1);
    })
    .listen(Number(SERVER_PORT), () => {
      console.log(`> Ready on http://localhost:${SERVER_PORT}`);
    });
});
