interface MicrophonePermissionStatusProps {
  permission: PermissionState | null;
}

export default function MicrophonePermissionStatus({ permission }: MicrophonePermissionStatusProps) {
  const getStatusConfig = () => {
    switch (permission) {
      case "granted":
        return {
          text: "허용됨",
          className: "bg-green-100 text-green-800"
        };
      case "denied":
        return {
          text: "거부됨",
          className: "bg-red-100 text-red-800"
        };
      default:
        return {
          text: "필요함",
          className: "bg-yellow-100 text-yellow-800"
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <div className="text-2xl mr-3">🎤</div>
          <span className="font-medium">마이크 권한</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.className}`}>
          {statusConfig.text}
        </span>
      </div>
    </div>
  );
}