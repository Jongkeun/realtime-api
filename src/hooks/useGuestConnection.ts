import { useEffect } from "react";

interface ConnectionSteps {
  audioReady: boolean;
  aiConnected: boolean;
  roomCreated: boolean;
  guestWaiting: boolean;
}

interface UseGuestConnectionProps {
  voiceRelay: any;
  setConnectionSteps: React.Dispatch<React.SetStateAction<ConnectionSteps>>;
}

export function useGuestConnection({ voiceRelay, setConnectionSteps }: UseGuestConnectionProps) {
  useEffect(() => {
    if (voiceRelay.isGuestConnected) {
      setConnectionSteps((prev) => ({ ...prev, guestWaiting: false }));
      voiceRelay.startWebRTCConnection();
    }
  }, [voiceRelay.isGuestConnected]);
}
