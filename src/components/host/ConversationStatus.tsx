import CurrentSpeaker from './CurrentSpeaker';
import VoiceVisualizerSection from './VoiceVisualizerSection';

type Speaker = "guest" | "ai" | "none";

interface ConversationStatusProps {
  currentSpeaker: Speaker;
  isGuestConnected: boolean;
  guestAudioLevel?: number;
}

export default function ConversationStatus({ 
  currentSpeaker, 
  isGuestConnected, 
  guestAudioLevel 
}: ConversationStatusProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">현재 대화 상태</h2>
      
      <CurrentSpeaker currentSpeaker={currentSpeaker} />
      
      <VoiceVisualizerSection 
        isGuestConnected={isGuestConnected}
        guestAudioLevel={guestAudioLevel}
      />
    </div>
  );
}