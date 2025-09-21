import type { SocketIOServer, RoomInfo } from "./types";

export class RoomManager {
  private activeRooms = new Map<string, RoomInfo>();
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  createRoom(hostSocketId: string, hostName: string): string {
    const roomId = this.generateRoomId();
    
    const roomInfo: RoomInfo = {
      roomId,
      hostSocketId,
      hostName,
      guestCount: 0,
      maxGuests: 1,
      createdAt: new Date(),
    };

    this.activeRooms.set(roomId, roomInfo);
    this.broadcastRoomList();
    
    console.log(`호스트가 룸 생성: ${roomId} (${hostName})`);
    return roomId;
  }

  joinRoom(roomId: string, guestSocketId: string): { success: boolean; error?: string } {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    const roomInfo = this.activeRooms.get(roomId);

    if (!room || !roomInfo) {
      return { success: false, error: "존재하지 않는 룸입니다" };
    }

    const MAXIMUM_ROOM_SIZE = 2;
    if (room.size >= MAXIMUM_ROOM_SIZE) {
      return { success: false, error: "룸이 가득찼습니다" };
    }

    this.updateRoomInfo(roomId);
    console.log(`게스트가 룸 참여: ${roomId} (${roomInfo.hostName})`);
    
    return { success: true };
  }

  deleteRoom(roomId: string) {
    this.activeRooms.delete(roomId);
    console.log(`방 삭제됨: ${roomId}`);
    this.broadcastRoomList();
  }

  updateRoomInfo(roomId: string) {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    const roomInfo = this.activeRooms.get(roomId);

    if (room && roomInfo) {
      roomInfo.guestCount = room.size - 1; // 호스트 제외한 게스트 수
      this.broadcastRoomList();
    }
  }

  getRoomList(): RoomInfo[] {
    return Array.from(this.activeRooms.values());
  }

  getRoomInfo(roomId: string): RoomInfo | undefined {
    return this.activeRooms.get(roomId);
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(7);
  }

  private broadcastRoomList() {
    const rooms = this.getRoomList();
    this.io.emit("room-list-updated", rooms);
  }
}