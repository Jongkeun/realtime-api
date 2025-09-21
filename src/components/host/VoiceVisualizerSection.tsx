import VoiceVisualizer from '@/components/VoiceVisualizer';

interface VoiceVisualizerSectionProps {
  isGuestConnected: boolean;
  guestAudioLevel?: number;
}

export default function VoiceVisualizerSection({ 
  isGuestConnected, 
  guestAudioLevel 
}: VoiceVisualizerSectionProps) {
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-medium text-gray-700 mb-3">게스트 음성 수신 상태</h3>
      <div className="flex justify-center">
        <VoiceVisualizer
          isActive={isGuestConnected}
          audioLevel={guestAudioLevel}
          className="bg-white rounded-lg p-3 shadow-sm"
        />
      </div>
      <p className="text-xs text-gray-500 text-center mt-2">
        게스트의 음성이 실시간으로 들어오는 것을 확인할 수 있습니다
      </p>
      <p className="text-xs text-blue-600 text-center mt-1">
        Debug: guestAudioLevel = {guestAudioLevel?.toFixed(1) || 0}
      </p>
    </div>
  );
}