interface EmptyRoomsStateProps {
  onRefresh: () => void;
}

export default function EmptyRoomsState({ onRefresh }: EmptyRoomsStateProps) {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-4">🚫</div>
      <p className="text-gray-600 mb-2">현재 사용 가능한 방이 없습니다.</p>
      <p className="text-sm text-gray-500">호스트가 방을 만들 때까지 기다려주세요.</p>
      <button
        onClick={onRefresh}
        className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
      >
        🔄 새로고침
      </button>
    </div>
  );
}