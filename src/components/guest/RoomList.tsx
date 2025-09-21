import LoadingState from './LoadingState';
import EmptyRoomsState from './EmptyRoomsState';
import RoomCard from './RoomCard';

interface Room {
  roomId: string;
  hostName: string;
  createdAt: Date;
  guestCount: number;
  maxGuests: number;
}

interface RoomListProps {
  rooms: Room[];
  isLoading: boolean;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onRefresh: () => void;
}

export default function RoomList({ 
  rooms, 
  isLoading, 
  selectedRoomId, 
  onSelectRoom, 
  onRefresh 
}: RoomListProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <span className="mr-2">🏠</span>
        사용 가능한 방 목록
      </h2>

      {isLoading ? (
        <LoadingState />
      ) : rooms.length === 0 ? (
        <EmptyRoomsState onRefresh={onRefresh} />
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.roomId}
              room={room}
              isSelected={selectedRoomId === room.roomId}
              onSelect={onSelectRoom}
            />
          ))}
        </div>
      )}
    </div>
  );
}