import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "./useSocket";
import { useWebRTC } from "./useWebRTC";
import { useOpenAIRealtime } from "./useOpenAIRealtime";
import { AudioProcessor } from "@/utils/audioProcessor";
import { BUFFER_SIZE, MIN_BYTES } from "@/app/constants/audio";

interface VoiceRelayState {
  isHostReady: boolean;
  isGuestConnected: boolean;
  isAIConnected: boolean;
  isRelayActive: boolean;
  currentSpeaker: "guest" | "ai" | "none";
  error: string | null;

  guestAudioLevel: number; // 0-100 범위의 게스트 음성 레벨 (호스트에서 수신)
}

export interface VoiceRelayHostHook extends VoiceRelayState {
  webRTCState: {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    connectionState: RTCPeerConnectionState;
  };
  openAIState: {
    isConnected: boolean;
    conversationId: string | null;
  };
  initialize: (hostName: string) => Promise<string | null>;
  startWebRTCConnection: () => Promise<void>;
  startVoiceRelay: () => void;

  setupAIAudioOutput: () => MediaStream | null;
  clearError: () => void;
  cleanup: () => void;
}

export function useVoiceRelayHost(): VoiceRelayHostHook {
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const previousRelayActiveRef = useRef(false);
  const conversationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingResponseRef = useRef(false);
  const audioBufferCountRef = useRef(0);

  const [relayState, setRelayState] = useState<VoiceRelayState>({
    isHostReady: false,
    isGuestConnected: false,
    isAIConnected: false,
    isRelayActive: false,
    currentSpeaker: "none",
    error: null,

    guestAudioLevel: 0,
  });

  // 각 모듈 훅 사용
  const { socket, connectionState, createRoom } = useSocket();

  // AI 응답 오디오 콜백 설정
  const handleAIAudioResponse = (audioData: string) => {
    const processor = audioProcessorRef.current;
    if (processor && connectionState.role === "host") {
      console.log("🎤 !!! AI 응답 오디오 수신, 스트림으로 재생");
      processor.enqueueAIResponse(audioData);
      setRelayState((prev) => ({ ...prev, currentSpeaker: "ai" }));

      // 응답 시작시 플래그 설정
      if (!isProcessingResponseRef.current) {
        isProcessingResponseRef.current = true;
        console.log("🤖 !!! AI 응답 처리 시작");
      }
    } else {
      console.log("🎤 !!! AI 응답 오디오 수신, 스트림으로 재생 불가", {
        processor: !!processor,
        connectionState,
      });
    }
  };

  // AI 응답 완료 콜백 설정
  const handleAIResponseComplete = useCallback(() => {
    console.log("✅ AI 응답 완료, 다음 요청 준비");
    isProcessingResponseRef.current = false;
    setRelayState((prev) => ({ ...prev, currentSpeaker: "none" }));
  }, []);

  const webRTC = useWebRTC(socket, connectionState.role, connectionState.remoteSocketId);
  const openAI = useOpenAIRealtime({
    onAudioResponse: handleAIAudioResponse,
    onResponseComplete: handleAIResponseComplete,
  });

  // 게스트용 마이크 레벨 모니터링 시작
  const startMicrophoneMonitoring = useCallback(() => {
    if (connectionState.role !== "guest" || !webRTC.localStream) {
      return;
    }

    const processor = audioProcessorRef.current;
    if (!processor) {
      console.error("오디오 프로세서가 없습니다");
      return;
    }

    try {
      console.log("🎤 !!! 게스트 마이크 레벨 모니터링 시작");

      processor.setupInputProcessor(webRTC.localStream, (audioBuffer) => {
        // 오디오 데이터 분석
        const dataView = new DataView(audioBuffer);
        const bufferSize = audioBuffer.byteLength;
        let maxAmplitude = 0;

        // PCM16 데이터에서 진폭 체크 (2바이트씩)
        for (let i = 0; i < bufferSize; i += 2) {
          const sample = Math.abs(dataView.getInt16(i, true)); // little-endian
          maxAmplitude = Math.max(maxAmplitude, sample);
        }

        // 진폭을 0-100 레벨로 변환 (32767이 최대값)
        const level = Math.min(100, (maxAmplitude / 32767) * 100);
        console.log("🎤 !!! 게스트 마이크 레벨:", level, relayState.currentSpeaker);
        // 호스트는 게스트 마이크 레벨을 따로 저장하지 않음 (guestAudioLevel만 사용)
      });

      console.log("✅ 게스트 마이크 모니터링 설정 완료");
    } catch (error) {
      console.error("❌ 게스트 마이크 모니터링 설정 실패:", error);
    }
  }, [connectionState.role, webRTC.localStream]);

  // OpenAI 응답을 게스트로 전송하기 위한 오디오 스트림 생성
  const setupAIAudioOutput = useCallback(() => {
    if (connectionState.role !== "host") {
      console.warn("호스트만 AI 응답 출력을 설정할 수 있습니다");
      return null;
    }

    const processor = audioProcessorRef.current;
    if (!processor || !webRTC.isConnected) {
      console.error("오디오 프로세서가 없거나 WebRTC가 연결되지 않았습니다", {
        processor: !!processor,
        webRTCConnected: webRTC.isConnected,
      });
      return null;
    }

    try {
      // AI 응답용 실시간 MediaStream 생성
      const aiResponseStream = processor.createAIResponseStream();

      if (!aiResponseStream) {
        console.error("AI 응답 스트림 생성 실패");
        return null;
      }

      // WebRTC를 통해 송신 스트림 설정
      webRTC.setOutgoingStream(aiResponseStream);

      console.log("!! ✅ AI 응답 출력 설정 완료");
      return aiResponseStream;
    } catch (error) {
      console.error("❌ AI 응답 출력 설정 실패:", error);
      return null;
    }
  }, [connectionState.role, webRTC.isConnected]);

  // 오디오 프로세서 초기화
  useEffect(() => {
    const processor = new AudioProcessor();
    audioProcessorRef.current = processor;

    return () => {
      processor.cleanup();
    };
  }, []);

  // 상태 업데이트
  useEffect(() => {
    // 게스트 연결 상태 확인 로직 개선
    const isGuestConnected =
      connectionState.role === "host"
        ? !!connectionState.remoteSocketId // 호스트: 게스트 소켓 ID가 있으면 연결됨
        : connectionState.role === "guest" && webRTC.isConnected; // 게스트: 자신의 연결 상태

    const isRelayActive = webRTC.isConnected && openAI.isConnected && openAI.isSessionActive;

    // 호스트에서 릴레이가 활성화되면 AI 응답 출력 자동 설정
    if (isRelayActive && connectionState.role === "host" && !previousRelayActiveRef.current) {
      console.log("🔄 릴레이 활성화됨, AI 응답 출력 설정 중...");
      setupAIAudioOutput();
    }

    if (
      connectionState.role === "guest" &&
      webRTC.isConnected &&
      webRTC.localStream &&
      !previousRelayActiveRef.current
    ) {
      console.log("🔄 !!! 게스트 WebRTC 연결됨, 마이크 모니터링 시작 중...");
      startMicrophoneMonitoring();
    }

    // 릴레이가 비활성화되면 오디오 프로세서 정리
    if (!isRelayActive && previousRelayActiveRef.current && audioProcessorRef.current) {
      console.log("🔄 릴레이 비활성화됨, 오디오 프로세서 정리 중...");

      // 타이머 정리
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current);
        conversationTimeoutRef.current = null;
      }

      // 상태 리셋
      isProcessingResponseRef.current = false;
      audioBufferCountRef.current = 0;

      // 오디오 프로세서 재초기화
      audioProcessorRef.current.cleanup();
      const newProcessor = new AudioProcessor();
      audioProcessorRef.current = newProcessor;
      newProcessor.initializeAudioContext();
    }

    // 이전 상태 추적 업데이트
    previousRelayActiveRef.current = isRelayActive;

    setRelayState((prev) => ({
      ...prev,
      isHostReady: connectionState.role === "host" && connectionState.isConnected,
      isGuestConnected,
      isAIConnected: openAI.isConnected && openAI.isSessionActive,
      isRelayActive,
      error: webRTC.connectionState === "failed" ? "WebRTC 연결 실패" : openAI.lastError,
    }));
  }, [
    connectionState,
    webRTC.isConnected,
    webRTC.connectionState,
    webRTC.localStream,
    webRTC.remoteStream,
    openAI.isConnected,
    openAI.isSessionActive,
    openAI.lastError,
    setupAIAudioOutput,
    startMicrophoneMonitoring,
  ]);

  // 호스트: 방 생성 및 시스템 초기화
  const initialize = useCallback(
    async (hostName: string): Promise<string | null> => {
      try {
        // 오디오 프로세서 초기화
        const processor = audioProcessorRef.current;
        if (!processor) {
          throw new Error("오디오 프로세서가 초기화되지 않았습니다");
        }

        const audioInitialized = await processor.initializeAudioContext();
        if (!audioInitialized) {
          throw new Error("오디오 컨텍스트 초기화 실패");
        }

        // OpenAI 연결
        const aiConnected = await openAI.connectToOpenAI();
        if (!aiConnected) {
          throw new Error("OpenAI 연결 실패");
        }

        // 소켓 방 생성
        const roomId = await new Promise<string>((resolve, reject) => {
          createRoom(hostName, (roomId) => {
            console.log("호스트 초기화 완료, 방 ID:", roomId);
            resolve(roomId);
          });

          // 타임아웃 설정
          setTimeout(() => {
            reject(new Error("방 생성 타임아웃"));
          }, 5000);
        });

        return roomId;
      } catch (error) {
        console.error("호스트 초기화 실패:", error);
        setRelayState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "호스트 초기화 실패",
        }));
        return null;
      }
    },
    [createRoom, openAI],
  );

  // WebRTC 연결 시작 (호스트가 게스트 참여 후 호출)
  const startWebRTCConnection = useCallback(async () => {
    if (connectionState.role !== "host" || !connectionState.remoteSocketId) {
      console.warn("호스트가 아니거나 원격 소켓이 없습니다:", {
        role: connectionState.role,
        remoteSocketId: connectionState.remoteSocketId,
      });
      return;
    }

    try {
      console.log("WebRTC Offer 생성 시작...");
      await webRTC.createOffer();
      console.log("WebRTC 연결 시작됨");
    } catch (error) {
      console.error("WebRTC 연결 시작 실패:", error);
      setRelayState((prev) => ({
        ...prev,
        error: "WebRTC 연결 시작 실패",
      }));
    }
  }, [connectionState.role, connectionState.remoteSocketId, webRTC]);

  // 음성 릴레이 시작
  const startVoiceRelay = useCallback(() => {
    if (connectionState.role !== "host" || !webRTC.remoteStream) {
      console.warn("호스트가 아니거나 원격 스트림이 없습니다:", {
        role: connectionState.role,
        remoteStream: !!webRTC.remoteStream,
      });
      return;
    }

    const processor = audioProcessorRef.current;
    if (!processor) {
      console.error("오디오 프로세서가 없습니다");
      return;
    }

    try {
      // 게스트로부터 받은 음성을 OpenAI로 전송하도록 설정
      console.log("오디오 프로세서 설정 시작...");
      console.log("🔍 원격 스트림 상태 검증:", {
        remoteStream: !!webRTC.remoteStream,
        remoteStreamId: webRTC.remoteStream?.id,
        audioTracks: webRTC.remoteStream?.getAudioTracks().length || 0,
        audioTrackIds: webRTC.remoteStream
          ?.getAudioTracks()
          .map((t) => ({ id: t.id, enabled: t.enabled, muted: t.muted })),
        videoTracks: webRTC.remoteStream?.getVideoTracks().length || 0,
        allTracks: webRTC.remoteStream?.getTracks().length || 0,
      });

      processor.setupInputProcessor(webRTC.remoteStream, (audioBuffer) => {
        // 오디오 데이터 분석
        const dataView = new DataView(audioBuffer);
        const bufferSize = audioBuffer.byteLength;
        let hasAudio = false;
        let maxAmplitude = 0;

        // PCM16 데이터에서 진폭 체크 (2바이트씩)
        for (let i = 0; i < bufferSize; i += 2) {
          const sample = Math.abs(dataView.getInt16(i, true)); // little-endian
          if (sample > 100) {
            // 임계값 설정 (무음 감지)
            hasAudio = true;
          }
          maxAmplitude = Math.max(maxAmplitude, sample);
        }
        // 호스트에서 받는 게스트 음성 레벨 업데이트
        const guestLevel = Math.min(100, (maxAmplitude / 32767) * 100);

        // 게스트 오디오 레벨 업데이트 (항상)
        setRelayState((prev) => ({
          ...prev,
          guestAudioLevel: guestLevel,
        }));

        // 실제 음성이 감지될 때만 처리
        if (hasAudio) {
          console.log("✅ 실제 음성 감지됨, OpenAI로 전송");
          setRelayState((prev) => ({ ...prev, currentSpeaker: "guest" }));
          openAI.sendAudioData(audioBuffer);

          // 오디오 버퍼 카운트 증가
          audioBufferCountRef.current += 1;

          // 기존 타이머가 있다면 취소
          if (conversationTimeoutRef.current) {
            clearTimeout(conversationTimeoutRef.current);
          }
          // 충분한 오디오 데이터가 쌓이고 응답 처리중이 아닐 때만 요청
          if (audioBufferCountRef.current * BUFFER_SIZE * 2 >= MIN_BYTES && !isProcessingResponseRef.current) {
            conversationTimeoutRef.current = setTimeout(() => {
              console.log("🎤 대화 시작 요청 (버퍼:", audioBufferCountRef.current, ")");
              openAI.startConversation();
              isProcessingResponseRef.current = true;
              audioBufferCountRef.current = 0; // 카운트 리셋
            }, 2000); // 2초 후 응답 요청
          }
        }
      });

      console.log("음성 릴레이 시작됨");
      setRelayState((prev) => ({ ...prev, isRelayActive: true }));
    } catch (error) {
      console.error("음성 릴레이 시작 실패:", error);
      setRelayState((prev) => ({
        ...prev,
        error: "음성 릴레이 시작 실패",
      }));
    }
  }, [connectionState.role, webRTC.remoteStream, openAI]);

  const clearError = useCallback(() => {
    setRelayState((prev) => ({ ...prev, error: null }));
  }, []);

  const cleanup = useCallback(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.cleanup();
    }
    openAI.disconnect();
  }, [openAI]);

  useEffect(() => {
    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.cleanup();
      }
      openAI.disconnect();
    };
  }, []);

  return {
    ...relayState,
    webRTCState: {
      localStream: webRTC.localStream,
      remoteStream: webRTC.remoteStream,
      connectionState: webRTC.connectionState,
    },
    openAIState: {
      isConnected: openAI.isConnected,
      conversationId: openAI.conversationId,
    },

    // 액션
    initialize,
    startWebRTCConnection,
    startVoiceRelay,
    setupAIAudioOutput,
    clearError,
    cleanup,
  };
}
