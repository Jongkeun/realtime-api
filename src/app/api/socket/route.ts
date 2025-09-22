import { Server as ServerIO } from "socket.io";
import { Server as NetServer } from "http";
import { Socket as NetSocket } from "net";

interface SocketServer extends NetServer {
  io?: ServerIO | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends Response {
  socket: SocketWithIO;
}

export async function GET() {
  const res = new Response() as NextApiResponseWithSocket;

  if (!res.socket.server.io) {
    console.log("Starting Socket.IO server...");

    const io = new ServerIO(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // WebRTC 시그널링 처리
    io.on("connection", (socket) => {
      console.log("클라이언트 연결:", socket.id);

      // 룸 생성
      socket.on("create-room", (callback) => {
        const roomId = Math.random().toString(36).substring(7);
        socket.join(roomId);
        socket.data.role = "host";
        socket.data.roomId = roomId;
        callback({ roomId });
        console.log(`호스트가 룸 생성: ${roomId}`);
      });

      // 룸 참여
      socket.on("join-room", (roomId, callback) => {
        const room = io.sockets.adapter.rooms.get(roomId);

        if (!room) {
          callback({ error: "존재하지 않는 룸입니다" });
          return;
        }

        if (room.size >= 2) {
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
      socket.on("offer", (offer, targetSocketId) => {
        socket.to(targetSocketId).emit("offer", offer, socket.id);
        console.log("Offer 전송");
      });

      socket.on("answer", (answer, targetSocketId) => {
        socket.to(targetSocketId).emit("answer", answer, socket.id);
        console.log("Answer 전송");
      });

      socket.on("ice-candidate", (candidate, targetSocketId) => {
        socket.to(targetSocketId).emit("ice-candidate", candidate, socket.id);
        console.log("ICE candidate 전송");
      });

      // 연결 해제
      socket.on("disconnect", () => {
        console.log("클라이언트 연결 해제:", socket.id);
        if (socket.data.roomId) {
          socket.to(socket.data.roomId).emit("user-left", socket.id);
        }
      });
    });

    res.socket.server.io = io;
  }

  return new Response("Socket.IO server started", { status: 200 });
}
