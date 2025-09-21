type Speaker = "guest" | "ai" | "none";

interface ConversationSpeakerProps {
  currentSpeaker: Speaker;
}

export default function ConversationSpeaker({ currentSpeaker }: ConversationSpeakerProps) {
  const getSpeakerDisplay = () => {
    switch (currentSpeaker) {
      case "guest":
        return {
          icon: "👦",
          title: "말하고 있어요...",
          subtitle: "계속 말해보세요!"
        };
      case "ai":
        return {
          icon: "🤖",
          title: "AI가 대답하는 중...",
          subtitle: "잠시만 기다려주세요..."
        };
      case "none":
      default:
        return {
          icon: "🔇",
          title: "들을 준비가 되었어요!",
          subtitle: "마이크에 대고 말해보세요!"
        };
    }
  };

  const speakerDisplay = getSpeakerDisplay();

  return (
    <div className="text-center mb-6">
      <div className="text-4xl mb-4">{speakerDisplay.icon}</div>
      <p className="text-xl font-bold text-gray-800 mb-2">{speakerDisplay.title}</p>
      <p className="text-gray-600 mb-4">{speakerDisplay.subtitle}</p>
    </div>
  );
}