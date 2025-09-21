import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents, ConnectionState, RoomInfo } from "@/types/socket";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    roomId: null,
    role: null,
    remoteSocketId: null,
  });
  const [roomList, setRoomList] = useState<RoomInfo[]>([]);

  useEffect(() => {
    const socket: TypedSocket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState((prev) => ({
        ...prev,
        isConnected: true,
      }));
      setRoomList([]);
      console.log("Socket 연결 성공:", socket.id);
    });

    socket.on("disconnect", () => {
      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
      }));
      console.log("Socket 연결 해제");
    });

    socket.on("user-joined", (socketId: string) => {
      setConnectionState((prev) => ({
        ...prev,
        remoteSocketId: socketId,
      }));
      console.log("사용자 참여:", socketId);
    });

    socket.on("user-left", (socketId: string) => {
      setConnectionState((prev) => ({
        ...prev,
        remoteSocketId: null,
      }));
      console.log("사용자 퇴장:", socketId);
    });

    socket.on("room-list-updated", (rooms: RoomInfo[]) => {
      setRoomList(rooms);
      console.log("방 목록 업데이트:", rooms);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = (hostName: string, callback: (roomId: string) => void) => {
    console.log("createRoom 호출됨:", { hostName, hasSocket: !!socketRef.current });

    if (!socketRef.current) {
      console.error("Socket이 연결되지 않음");
      return;
    }

    console.log("create-room 이벤트 전송 중...");
    socketRef.current.emit("create-room", hostName, ({ roomId }) => {
      console.log("서버로부터 roomId 응답 받음:", roomId);
      setConnectionState((prev) => ({
        ...prev,
        roomId,
        role: "host",
      }));
      callback(roomId);
    });
  };

  const joinRoom = (roomId: string, callback: (success: boolean, error?: string) => void) => {
    if (!socketRef.current) return;

    socketRef.current.emit("join-room", roomId, (response) => {
      if (response.success) {
        setConnectionState((prev) => ({
          ...prev,
          roomId,
          role: "guest",
        }));
        callback(true);
      } else {
        callback(false, response.error);
      }
    });
  };

  const getRoomList = (callback: (rooms: RoomInfo[]) => void) => {
    console.log("getRoomList 호출됨, hasSocket:", !!socketRef.current);

    if (!socketRef.current) {
      console.error("Socket이 연결되지 않음");
      return;
    }

    console.log("get-room-list 이벤트 전송 중...");
    socketRef.current.emit("get-room-list", ({ rooms }) => {
      console.log("서버로부터 rooms 응답 받음:", rooms);
      callback(rooms);
      setRoomList(rooms);
    });
  };

  return {
    socket: socketRef.current,
    connectionState,
    roomList,
    createRoom,
    joinRoom,
    getRoomList,
  };
}
