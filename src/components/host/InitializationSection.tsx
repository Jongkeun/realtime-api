import HostNameInput from './HostNameInput';

interface InitializationSectionProps {
  hostName: string;
  onHostNameChange: (name: string) => void;
  onInitialize: () => Promise<void>;
  isInitializing: boolean;
}

export default function InitializationSection({ 
  hostName, 
  onHostNameChange, 
  onInitialize, 
  isInitializing 
}: InitializationSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">시스템 초기화</h2>

      <HostNameInput
        hostName={hostName}
        onChange={onHostNameChange}
        disabled={isInitializing}
      />

      <button
        onClick={onInitialize}
        disabled={isInitializing || !hostName.trim()}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 
                   text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {isInitializing ? "초기화 중..." : "호스트 시작하기"}
      </button>
    </div>
  );
}