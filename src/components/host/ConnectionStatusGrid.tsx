interface ConnectionState {
  audioReady: boolean;
  aiConnected: boolean;
  roomCreated: boolean;
  guestWaiting: boolean;
}

interface VoiceRelay {
  isAIConnected: boolean;
  isGuestConnected: boolean;
  isRelayActive: boolean;
}

interface ConnectionStatusGridProps {
  connectionSteps: ConnectionState;
  voiceRelay: VoiceRelay;
}

function getConnectionStatusColor(isConnected: boolean, isWaiting: boolean = false) {
  if (isWaiting) return "text-yellow-600";
  return isConnected ? "text-green-600" : "text-red-600";
}

function getConnectionStatusText(isConnected: boolean, isWaiting: boolean = false) {
  if (isWaiting) return "대기 중...";
  return isConnected ? "연결됨" : "연결 안됨";
}

export default function ConnectionStatusGrid({ connectionSteps, voiceRelay }: ConnectionStatusGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium">오디오 시스템</span>
        <span className={`text-sm font-semibold ${getConnectionStatusColor(connectionSteps.audioReady)}`}>
          {getConnectionStatusText(connectionSteps.audioReady)}
        </span>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium">AI 연결</span>
        <span className={`text-sm font-semibold ${getConnectionStatusColor(voiceRelay.isAIConnected)}`}>
          {getConnectionStatusText(voiceRelay.isAIConnected)}
        </span>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium">게스트 연결</span>
        <span
          className={`text-sm font-semibold ${getConnectionStatusColor(
            voiceRelay.isGuestConnected,
            connectionSteps.guestWaiting,
          )}`}
        >
          {connectionSteps.guestWaiting
            ? "게스트 대기 중..."
            : getConnectionStatusText(voiceRelay.isGuestConnected)}
        </span>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium">릴레이 활성</span>
        <span className={`text-sm font-semibold ${getConnectionStatusColor(voiceRelay.isRelayActive)}`}>
          {getConnectionStatusText(voiceRelay.isRelayActive)}
        </span>
      </div>
    </div>
  );
}