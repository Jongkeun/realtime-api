export interface BaseVoiceRelayState {
  isAIConnected: boolean;
  isRelayActive: boolean;
  currentSpeaker: "guest" | "ai" | "none";
  error: string | null;
}

export interface HostVoiceRelayState extends BaseVoiceRelayState {
  isHostReady: boolean;
  isGuestConnected: boolean;
  guestAudioLevel: number; // 호스트에서 수신하는 게스트 음성 레벨
}

export interface GuestVoiceRelayState extends BaseVoiceRelayState {
  isConnected: boolean;
  microphoneLevel: number; // 게스트 마이크 입력 레벨
}