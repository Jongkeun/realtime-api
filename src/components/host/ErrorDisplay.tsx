interface ErrorDisplayProps {
  error: string | null;
  onClearError: () => void;
}

export default function ErrorDisplay({ error, onClearError }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <div className="text-red-400 mr-3">⚠️</div>
        <div>
          <h3 className="text-red-800 font-semibold">오류 발생</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
        <button onClick={onClearError} className="ml-auto text-red-400 hover:text-red-600">
          ✕
        </button>
      </div>
    </div>
  );
}