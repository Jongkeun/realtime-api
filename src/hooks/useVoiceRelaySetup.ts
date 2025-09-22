import { useEffect, useRef } from "react";
import { VoiceRelayHostHook } from "./useVoiceRelayHost";

interface UseVoiceRelaySetupProps {
  voiceRelay: VoiceRelayHostHook;
}

export function useVoiceRelaySetup({ voiceRelay }: UseVoiceRelaySetupProps) {
  const relayTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (voiceRelay.webRTCState.connectionState === "connected" && voiceRelay.isAIConnected) {
      // 이전 타이머 정리
      if (relayTimeoutRef.current) {
        clearTimeout(relayTimeoutRef.current);
      }

      // 오디오 스트림 준비 상태를 확인하는 함수
      const checkAudioReadyAndStart = () => {
        try {
          // 바로 시도해보고, 실패하면 재시도
          voiceRelay.startVoiceRelay();
        } catch (error) {
          console.warn("음성 릴레이 시작 재시도 중...", error);

          // 실패 시 100ms 후 재시도 (최대 5초까지)
          relayTimeoutRef.current = setTimeout(() => {
            if (voiceRelay.webRTCState.connectionState === "connected" && voiceRelay.isAIConnected) {
              checkAudioReadyAndStart();
            }
          }, 100);
        }
      };

      // 최초 시작은 약간의 지연 후 (WebRTC 안정화 시간)
      relayTimeoutRef.current = setTimeout(checkAudioReadyAndStart, 200);
    }

    // 정리 함수
    return () => {
      if (relayTimeoutRef.current) {
        clearTimeout(relayTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceRelay.webRTCState.connectionState, voiceRelay.isAIConnected]);
}
