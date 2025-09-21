"use client";

import { useState } from "react";
import { useMicrophonePermission } from "@/hooks/useMicrophonePermission";
import GuestRoomList from "@/components/GuestRoomList";
import GuestChatRoom from "@/components/GuestChatRoom";
import { useVoiceRelayGuest } from "@/hooks/useVoiceRelayGuest";

export default function GuestPage() {
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const voiceRelay = useVoiceRelayGuest();
  const microphone = useMicrophonePermission();

  // 방 참여
  const handleJoinRoom = async (roomId: string) => {
    setIsJoining(true);

    try {
      // 마이크 권한 요청
      const permissionGranted = await microphone.requestPermission();
      if (!permissionGranted) {
        throw new Error(microphone.error || "마이크 권한이 필요합니다.");
      }

      // 방 참여
      const joined = await voiceRelay.joinAsGuest(roomId);
      if (joined) {
        setHasJoined(true);
      }
    } catch (error) {
      console.error("방 참여 실패:", error);
    } finally {
      setIsJoining(false);
    }
  };

  // 방에 참여했으면 채팅룸, 아니면 방 목록 표시
  if (hasJoined) {
    return <GuestChatRoom voiceRelay={voiceRelay} />;
  }

  return <GuestRoomList onJoinRoom={handleJoinRoom} isJoining={isJoining} />;
}
