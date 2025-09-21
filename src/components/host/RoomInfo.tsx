interface RoomInfoProps {
  roomId: string;
}

export default function RoomInfo({ roomId }: RoomInfoProps) {
  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-600 mb-1">방 코드</p>
      <p className="text-2xl font-mono font-bold text-blue-600">{roomId}</p>
      <p className="text-xs text-gray-500 mt-1">게스트가 이 코드로 참여할 수 있습니다</p>
    </div>
  );
}