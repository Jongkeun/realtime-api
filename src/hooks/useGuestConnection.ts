import { useEffect } from "react";
import { VoiceRelayHostHook } from "./useVoiceRelayHost";

interface ConnectionSteps {
  audioReady: boolean;
  aiConnected: boolean;
  roomCreated: boolean;
  guestWaiting: boolean;
}

interface UseGuestConnectionProps {
  voiceRelay: VoiceRelayHostHook;
  setConnectionSteps: React.Dispatch<React.SetStateAction<ConnectionSteps>>;
}

export function useGuestConnection({ voiceRelay, setConnectionSteps }: UseGuestConnectionProps) {
  useEffect(() => {
    if (voiceRelay.isGuestConnected) {
      setConnectionSteps((prev) => ({ ...prev, guestWaiting: false }));
      voiceRelay.startWebRTCConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceRelay.isGuestConnected]);
}
