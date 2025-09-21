interface Room {
  roomId: string;
  hostName: string;
  createdAt: Date;
  guestCount: number;
  maxGuests: number;
}

interface RoomCardProps {
  room: Room;
  isSelected: boolean;
  onSelect: (roomId: string) => void;
}

export default function RoomCard({ room, isSelected, onSelect }: RoomCardProps) {
  const isRoomFull = room.guestCount >= room.maxGuests;

  return (
    <div
      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? "border-purple-500 bg-purple-50"
          : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
      }`}
      onClick={() => onSelect(room.roomId)}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center">
            <span className="mr-2">👨‍💼</span>
            {room.hostName}
          </h3>
          <p className="text-sm text-gray-600">
            방 ID: <span className="font-mono">{room.roomId}</span>
          </p>
          <p className="text-xs text-gray-500">
            생성 시간: {new Date(room.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="text-right">
          <div
            className={`px-2 py-1 rounded text-xs font-semibold ${
              isRoomFull ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
            }`}
          >
            {isRoomFull ? "가득 참" : "참여 가능"}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {room.guestCount}/{room.maxGuests} 명
          </p>
        </div>
      </div>
    </div>
  );
}