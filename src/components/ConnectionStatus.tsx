import { VoiceRelayClient } from "@/hooks/useVoiceRelayGuest";

interface Props {
  voiceRelay: VoiceRelayClient;
}

export default function ConnectionStatus({ voiceRelay }: Props) {
  const hasJoined = voiceRelay.webRTCState.connectionState === "connected";

  const getConnectionMessage = () => {
    if (!hasJoined) return null;

    if (!voiceRelay.webRTCState.localStream) {
      return { type: "info", message: "마이크 연결 중..." };
    }

    if (voiceRelay.webRTCState.connectionState === "connecting") {
      return { type: "info", message: "호스트와 연결 중..." };
    }

    if (voiceRelay.webRTCState.connectionState === "connected") {
      return { type: "success", message: "AI 친구와 대화할 준비가 되었어요!" };
    }

    if (voiceRelay.webRTCState.connectionState === "failed") {
      return { type: "error", message: "연결에 실패했어요. 다시 시도해주세요." };
    }

    return { type: "info", message: "연결 준비 중..." };
  };

  const connectionMessage = getConnectionMessage();

  return (
    connectionMessage && (
      <div
        className={`rounded-2xl p-6 mb-6 text-center ${
          connectionMessage.type === "success"
            ? "bg-green-50 border-2 border-green-200"
            : connectionMessage.type === "error"
            ? "bg-red-50 border-2 border-red-200"
            : "bg-blue-50 border-2 border-blue-200"
        }`}
      >
        <div className="text-4xl mb-3">
          {connectionMessage.type === "success" ? "✅" : connectionMessage.type === "error" ? "😢" : "⏳"}
        </div>
        <p
          className={`text-lg font-semibold ${
            connectionMessage.type === "success"
              ? "text-green-800"
              : connectionMessage.type === "error"
              ? "text-red-800"
              : "text-blue-800"
          }`}
        >
          {connectionMessage.message}
        </p>
      </div>
    )
  );
}
