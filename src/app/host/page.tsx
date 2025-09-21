"use client";

import { useState, useEffect } from "react";
import { useVoiceRelayHost } from "@/hooks/useVoiceRelayHost";
import {
  PageHeader,
  InitializationSection,
  ConnectionStatus,
  ConversationStatus,
  ErrorDisplay,
  UsageInstructions,
  Navigation,
} from "@/components/host";

export default function HostPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hostName, setHostName] = useState<string>("테스트");
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionSteps, setConnectionSteps] = useState({
    audioReady: false,
    aiConnected: false,
    roomCreated: false,
    guestWaiting: true,
  });

  const voiceRelay = useVoiceRelayHost();

  // 호스트 초기화
  const handleInitialize = async () => {
    if (!hostName.trim()) {
      alert("호스트 이름을 입력해주세요.");
      return;
    }

    setIsInitializing(true);
    setConnectionSteps((prev) => ({ ...prev, audioReady: false, aiConnected: false, roomCreated: false }));

    try {
      // 호스트는 마이크 권한이 필요하지 않음
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
  };

  // 게스트 참여 감지 및 WebRTC 연결 시작
  useEffect(() => {
    if (voiceRelay.isGuestConnected) {
      setConnectionSteps((prev) => ({ ...prev, guestWaiting: false }));

      // WebRTC 연결 시작
      voiceRelay.startWebRTCConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceRelay.isGuestConnected]);

  // WebRTC 연결 완료 후 음성 릴레이 시작
  useEffect(() => {
    if (voiceRelay.webRTCState.connectionState === "connected" && voiceRelay.isAIConnected) {
      setTimeout(() => {
        voiceRelay.startVoiceRelay();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceRelay.webRTCState.connectionState, voiceRelay.isAIConnected]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <PageHeader />

        {!roomId && (
          <InitializationSection
            hostName={hostName}
            onHostNameChange={setHostName}
            onInitialize={handleInitialize}
            isInitializing={isInitializing}
          />
        )}

        {roomId && <ConnectionStatus roomId={roomId} connectionSteps={connectionSteps} voiceRelay={voiceRelay} />}

        {voiceRelay.isRelayActive && (
          <ConversationStatus
            currentSpeaker={voiceRelay.currentSpeaker}
            isGuestConnected={voiceRelay.isGuestConnected}
            guestAudioLevel={voiceRelay.guestAudioLevel}
          />
        )}

        <ErrorDisplay error={voiceRelay.error} onClearError={voiceRelay.clearError} />

        <UsageInstructions />

        <Navigation />
      </div>
    </div>
  );
}
