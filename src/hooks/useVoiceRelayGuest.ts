import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "./useSocket";
import { useWebRTC } from "./useWebRTC";
import { AudioProcessor } from "@/utils/audioProcessor";

interface VoiceRelayState {
  currentSpeaker: "guest" | "ai" | "none";
  error: string | null;
  microphoneLevel: number; // 0-100 범위의 마이크 입력 레벨 (게스트용)
}

export interface VoiceRelayClient extends VoiceRelayState {
  webRTCState: {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    connectionState: RTCPeerConnectionState;
  };
  joinAsGuest: (roomId: string) => Promise<boolean>;
  startMicrophoneMonitoring: () => void;
  clearError: () => void;
  cleanup: () => void;
}

export function useVoiceRelayGuest(): VoiceRelayClient {
  const audioProcessorRef = useRef<AudioProcessor | null>(null);

  const [relayState, setRelayState] = useState<VoiceRelayState>({
    currentSpeaker: "none",
    error: null,
    microphoneLevel: 0,
  });

  // 각 모듈 훅 사용
  const { socket, connectionState, joinRoom } = useSocket();

  const webRTC = useWebRTC(socket, connectionState.role, connectionState.remoteSocketId);

  // 게스트용 마이크 레벨 모니터링 시작
  const startMicrophoneMonitoring = useCallback(() => {
    if (!webRTC.localStream) {
      return;
    }

    const processor = audioProcessorRef.current;
    if (!processor) {
      console.error("오디오 프로세서가 없습니다");
      return;
    }

    try {
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
        console.log("🎤 !!! 게스트 마이크 레벨:", level);
        setRelayState((prev) => ({
          ...prev,
          microphoneLevel: level,
        }));
      });

      console.log("✅ 게스트 마이크 모니터링 설정 완료");
    } catch (error) {
      console.error("❌ 게스트 마이크 모니터링 설정 실패:", error);
    }
  }, [webRTC.localStream]);

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
    if (webRTC.isConnected && webRTC.localStream) {
      startMicrophoneMonitoring();
    }

    if (webRTC.connectionState === "failed") {
      setRelayState((prev) => ({
        ...prev,
        error: "WebRTC 연결 실패",
      }));
    }
  }, [
    connectionState,
    webRTC.isConnected,
    webRTC.connectionState,
    webRTC.localStream,
    webRTC.remoteStream,
    startMicrophoneMonitoring,
  ]);

  // 게스트: 방 참여
  const joinAsGuest = useCallback(
    async (roomId: string): Promise<boolean> => {
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

        // 소켓 방 참여
        const success = await new Promise<boolean>((resolve, reject) => {
          joinRoom(roomId, (success, error) => {
            if (success) {
              console.log("게스트 참여 완료, 방 ID:", roomId);
              resolve(true);
            } else {
              reject(new Error(error || "방 참여 실패"));
            }
          });

          // 타임아웃 설정
          setTimeout(() => {
            reject(new Error("방 참여 타임아웃"));
          }, 5000);
        });

        return success;
      } catch (error) {
        console.error("게스트 참여 실패:", error);
        setRelayState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "게스트 참여 실패",
        }));
        return false;
      }
    },
    [joinRoom],
  );

  // 에러 클리어
  const clearError = useCallback(() => {
    setRelayState((prev) => ({ ...prev, error: null }));
  }, []);

  // 전체 시스템 정리
  const cleanup = useCallback(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.cleanup();
    }
  }, []);

  // 게스트용 AI 말하기 상태 감지
  useEffect(() => {
    if (!webRTC.remoteStream) {
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationId: number | null = null;

    const setupAIDetection = async () => {
      try {
        // 오디오 컨텍스트 생성
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        // 원격 스트림을 분석기에 연결
        source = audioContext.createMediaStreamSource(webRTC.remoteStream!);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let silentFrames = 0;
        const SILENT_THRESHOLD = 10; // AI가 말하지 않는다고 판단할 임계값
        const FRAMES_TO_SILENT = 100; // 100프레임 연속 조용하면 말하기 중단으로 판단

        const checkAudioLevel = () => {
          if (!analyser) return;

          analyser.getByteFrequencyData(dataArray);

          // 평균 볼륨 계산
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

          if (average > SILENT_THRESHOLD) {
            // AI가 말하고 있음
            silentFrames = 0;
            setRelayState((prev) => {
              if (prev.currentSpeaker !== "ai") {
                console.log("🎤 AI 말하기 시작 감지");
                return { ...prev, currentSpeaker: "ai" };
              }
              return prev;
            });
          } else {
            // 조용한 상태
            silentFrames++;
            if (silentFrames >= FRAMES_TO_SILENT) {
              setRelayState((prev) => {
                if (prev.currentSpeaker === "ai") {
                  console.log("🔇 AI 말하기 종료 감지");
                  return { ...prev, currentSpeaker: "none" };
                }
                return prev;
              });
            }
          }

          animationId = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      } catch (error) {
        console.error("AI 감지 설정 실패:", error);
      }
    };

    setupAIDetection();

    // 정리 함수
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (source) {
        source.disconnect();
      }
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  }, [connectionState.role, webRTC.remoteStream]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.cleanup();
      }
    };
  }, []);

  return {
    // 상태
    ...relayState,
    webRTCState: {
      localStream: webRTC.localStream,
      remoteStream: webRTC.remoteStream,
      connectionState: webRTC.connectionState,
    },

    // 액션
    joinAsGuest,
    startMicrophoneMonitoring,
    clearError,
    cleanup,
  };
}
