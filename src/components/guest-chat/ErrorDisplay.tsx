interface ErrorDisplayProps {
  error: string | null;
  onClearError: () => void;
}

export default function ErrorDisplay({ error, onClearError }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center">
        <div className="text-red-400 mr-3 text-2xl">😔</div>
        <div className="flex-1">
          <h3 className="text-red-800 font-semibold">앗, 문제가 생겼어요!</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
        <button onClick={onClearError} className="text-red-400 hover:text-red-600 text-xl">
          ✕
        </button>
      </div>
    </div>
  );
}