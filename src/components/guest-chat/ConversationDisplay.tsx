import ConversationSpeaker from "./ConversationSpeaker";
import VoiceVisualizerSection from "./VoiceVisualizerSection";

type Speaker = "guest" | "ai" | "none";

interface WebRTCState {
  connectionState: string;
}

interface ConversationDisplayProps {
  currentSpeaker: Speaker;
  webRTCState: WebRTCState;
  microphoneLevel?: number;
}

export default function ConversationDisplay({
  currentSpeaker,
  webRTCState,
  microphoneLevel,
}: ConversationDisplayProps) {
  if (webRTCState.connectionState !== "connected") {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <ConversationSpeaker currentSpeaker={currentSpeaker} />

      <VoiceVisualizerSection
        isActive={webRTCState.connectionState === "connected"}
        microphoneLevel={microphoneLevel}
      />
    </div>
  );
}
