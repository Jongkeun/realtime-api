type Speaker = "guest" | "ai" | "none";

interface CurrentSpeakerProps {
  currentSpeaker: Speaker;
}

export default function CurrentSpeaker({ currentSpeaker }: CurrentSpeakerProps) {
  const getSpeakerDisplay = () => {
    switch (currentSpeaker) {
      case "guest":
        return {
          icon: "👶",
          text: "아이가 말하는 중...",
          className: "text-blue-600"
        };
      case "ai":
        return {
          icon: "🤖",
          text: "AI가 응답하는 중...",
          className: "text-green-600"
        };
      case "none":
      default:
        return {
          icon: "🔇",
          text: "대기 중...",
          className: "text-gray-500"
        };
    }
  };

  const speakerDisplay = getSpeakerDisplay();

  return (
    <div className="flex items-center justify-center p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
      <div className="text-center">
        <div className="text-4xl mb-2">{speakerDisplay.icon}</div>
        <p className={`text-lg font-semibold ${speakerDisplay.className}`}>
          {speakerDisplay.text}
        </p>
      </div>
    </div>
  );
}