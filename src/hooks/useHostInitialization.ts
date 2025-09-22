import { useState, useCallback } from "react";
import { VoiceRelayHostHook } from "./useVoiceRelayHost";

interface ConnectionSteps {
  audioReady: boolean;
  aiConnected: boolean;
  roomCreated: boolean;
  guestWaiting: boolean;
}

export function useHostInitialization(voiceRelay: VoiceRelayHostHook) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hostName, setHostName] = useState<string>("호스트 이름");
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionSteps, setConnectionSteps] = useState<ConnectionSteps>({
    audioReady: false,
    aiConnected: false,
    roomCreated: false,
    guestWaiting: true,
  });

  const handleInitialize = useCallback(async () => {
    if (!hostName.trim()) {
      alert("호스트 이름을 입력해주세요.");
      return;
    }

    setIsInitializing(true);
    setConnectionSteps((prev) => ({
      ...prev,
      audioReady: false,
      aiConnected: false,
      roomCreated: false,
    }));

    try {
      const createdRoomId = await voiceRelay.initialize(hostName.trim());
      if (createdRoomId) {
        setRoomId(createdRoomId);
        setConnectionSteps((prev) => ({
          ...prev,
          audioReady: true,
          aiConnected: true,
          roomCreated: true,
          guestWaiting: true,
        }));
      }
    } catch (error) {
      console.error("호스트 초기화 실패:", error);
    } finally {
      setIsInitializing(false);
    }
  }, [hostName, voiceRelay]);

  return {
    roomId,
    hostName,
    setHostName,
    isInitializing,
    connectionSteps,
    setConnectionSteps,
    handleInitialize,
  };
}
