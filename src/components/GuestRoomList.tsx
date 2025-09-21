"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useMicrophonePermission } from "@/hooks/useMicrophonePermission";
import { PageHeader, RoomList, JoinRoomSection, UsageInstructions, Navigation } from "@/components/guest";

interface GuestRoomListProps {
  onJoinRoom: (roomId: string) => Promise<void>;
  isJoining: boolean;
}

export default function GuestRoomList({ onJoinRoom, isJoining }: GuestRoomListProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const { socket, roomList, getRoomList } = useSocket();
  const microphone = useMicrophonePermission();

  useEffect(() => {
    if (socket && socket.connected) {
      getRoomList(() => {
        setLoadingRooms(false);
      });
    }
  }, [socket, socket?.connected]);

  const handleJoinRoom = async () => {
    if (!selectedRoomId) return;
    await onJoinRoom(selectedRoomId);
  };

  const handleRefresh = () => {
    setLoadingRooms(true);
    getRoomList(() => setLoadingRooms(false));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-2xl mx-auto">
        <PageHeader />

        <RoomList
          rooms={roomList}
          isLoading={loadingRooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          onRefresh={handleRefresh}
        />

        <JoinRoomSection
          selectedRoomId={selectedRoomId}
          microphone={microphone}
          isJoining={isJoining}
          onJoinRoom={handleJoinRoom}
        />

        <UsageInstructions />

        <Navigation />
      </div>
    </div>
  );
}
