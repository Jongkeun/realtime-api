import MicrophonePermissionStatus from './MicrophonePermissionStatus';
import MicrophonePermissionError from './MicrophonePermissionError';

interface MicrophoneHook {
  permission: PermissionState | null;
  isLoading: boolean;
  error: string | null;
  resetPermission: () => void;
}

interface JoinRoomSectionProps {
  selectedRoomId: string | null;
  microphone: MicrophoneHook;
  isJoining: boolean;
  onJoinRoom: () => Promise<void>;
}

export default function JoinRoomSection({ 
  selectedRoomId, 
  microphone, 
  isJoining, 
  onJoinRoom 
}: JoinRoomSectionProps) {
  if (!selectedRoomId) return null;

  const getButtonText = () => {
    if (isJoining) return "참여 중...";
    if (microphone.isLoading) return "권한 요청 중...";
    return "🎉 방에 참여하기";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">방 참여 설정</h2>

      <MicrophonePermissionStatus permission={microphone.permission} />

      <button
        onClick={onJoinRoom}
        disabled={isJoining || microphone.isLoading || !selectedRoomId}
        className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 
                   text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {getButtonText()}
      </button>

      <MicrophonePermissionError
        permission={microphone.permission}
        error={microphone.error}
        onResetPermission={microphone.resetPermission}
      />
    </div>
  );
}