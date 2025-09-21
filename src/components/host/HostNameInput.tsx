interface HostNameInputProps {
  hostName: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}

export default function HostNameInput({ hostName, onChange, disabled = false }: HostNameInputProps) {
  return (
    <div className="mb-6">
      <label htmlFor="hostName" className="block text-sm font-medium text-gray-700 mb-2">
        호스트 이름
      </label>
      <input
        id="hostName"
        type="text"
        value={hostName}
        onChange={(e) => onChange(e.target.value)}
        placeholder="게스트가 볼 수 있는 이름을 입력하세요"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={disabled}
        maxLength={20}
      />
      <p className="text-xs text-gray-500 mt-1">최대 20자까지 입력 가능합니다</p>
    </div>
  );
}