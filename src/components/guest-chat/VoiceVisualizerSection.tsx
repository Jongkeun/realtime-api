import VoiceVisualizer from '@/components/VoiceVisualizer';

interface VoiceVisualizerSectionProps {
  isActive: boolean;
  microphoneLevel?: number;
}

export default function VoiceVisualizerSection({ isActive, microphoneLevel }: VoiceVisualizerSectionProps) {
  return (
    <div className="flex justify-center mt-6">
      <VoiceVisualizer
        isActive={isActive}
        audioLevel={microphoneLevel}
        className="bg-gray-50 rounded-xl p-4"
      />
    </div>
  );
}