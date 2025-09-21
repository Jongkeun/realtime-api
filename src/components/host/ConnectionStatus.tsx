import RoomInfo from './RoomInfo';
import ConnectionStatusGrid from './ConnectionStatusGrid';

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

interface ConnectionStatusProps {
  roomId: string;
  connectionSteps: ConnectionState;
  voiceRelay: VoiceRelay;
}

export default function ConnectionStatus({ roomId, connectionSteps, voiceRelay }: ConnectionStatusProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">연결 상태</h2>

      <RoomInfo roomId={roomId} />

      <ConnectionStatusGrid connectionSteps={connectionSteps} voiceRelay={voiceRelay} />
    </div>
  );
}