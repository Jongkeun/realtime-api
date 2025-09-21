"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useMicrophonePermission } from "@/hooks/useMicrophonePermission";
import Link from "next/link";

interface GuestRoomListProps {
  onJoinRoom: (roomId: string) => Promise<void>;
  isJoining: boolean;
}

export default function GuestRoomList({ onJoinRoom, isJoining }: GuestRoomListProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const { socket, roomList, getRoomList } = useSocket();
  const microphone = useMicrophonePermission();

  useEffect(() => {
    if (socket && socket.connected) {
      getRoomList(() => {
        setLoadingRooms(false);
      });
    }
  }, [socket, socket?.connected]);

  // 방 참여
  const handleJoinRoom = async () => {
    if (!selectedRoomId) return;
    await onJoinRoom(selectedRoomId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">👶 게스트 참여</h1>
          <p className="text-gray-600">참여하고 싶은 방을 선택해주세요</p>
        </div>

        {/* 방 목록 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="mr-2">🏠</span>
            사용 가능한 방 목록
          </h2>

          {loadingRooms ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">방 목록을 불러오는 중...</p>
            </div>
          ) : roomList.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🚫</div>
              <p className="text-gray-600 mb-2">현재 사용 가능한 방이 없습니다.</p>
              <p className="text-sm text-gray-500">호스트가 방을 만들 때까지 기다려주세요.</p>
              <button
                onClick={() => {
                  setLoadingRooms(true);
                  getRoomList((rooms) => setLoadingRooms(false));
                }}
                className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
              >
                🔄 새로고침
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {roomList.map((room) => (
                <div
                  key={room.roomId}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRoomId === room.roomId
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedRoomId(room.roomId)}
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
                          room.guestCount >= room.maxGuests ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {room.guestCount >= room.maxGuests ? "가득 참" : "참여 가능"}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {room.guestCount}/{room.maxGuests} 명
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 방 참여 버튼 */}
        {selectedRoomId && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">방 참여 설정</h2>

            {/* 마이크 권한 상태 */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🎤</div>
                  <span className="font-medium">마이크 권한</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    microphone.permission === "granted"
                      ? "bg-green-100 text-green-800"
                      : microphone.permission === "denied"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {microphone.permission === "granted"
                    ? "허용됨"
                    : microphone.permission === "denied"
                    ? "거부됨"
                    : "필요함"}
                </span>
              </div>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={isJoining || microphone.isLoading || !selectedRoomId}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 
                         text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isJoining ? "참여 중..." : microphone.isLoading ? "권한 요청 중..." : "🎉 방에 참여하기"}
            </button>

            {microphone.permission === "denied" && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="text-red-500 text-xl">⚠️</div>
                  <div className="flex-1">
                    <h4 className="text-red-800 font-semibold mb-2">마이크 권한이 필요합니다</h4>
                    <p className="text-red-700 text-sm mb-3">음성 채팅을 사용하려면 마이크 접근을 허용해야 합니다.</p>
                    <div className="text-red-700 text-sm mb-3">
                      <strong>권한 허용 방법:</strong>
                      <ol className="mt-1 ml-4 list-decimal">
                        <li>브라우저 주소창 왼쪽의 🔒 (또는 ⚠️) 아이콘 클릭</li>
                        <li>&quot;마이크&quot; 설정을 &quot;허용&quot;으로 변경</li>
                        <li>페이지 새로고침 또는 아래 버튼 클릭</li>
                      </ol>
                    </div>
                    <button
                      onClick={microphone.resetPermission}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded border border-red-300"
                    >
                      권한 다시 요청하기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {microphone.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">⚠️ {microphone.error}</p>
              </div>
            )}
          </div>
        )}

        {/* 사용 방법 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-semibold mb-2">🔍 사용 방법</h3>
          <ol className="text-blue-700 text-sm space-y-1">
            <li>1. 위의 방 목록에서 참여하고 싶은 방을 선택하세요</li>
            <li>2. 마이크 권한을 허용해주세요</li>
            <li>3. &quot;방에 참여하기&quot; 버튼을 클릭하세요</li>
            <li>4. 호스트와 연결되면 AI 친구와 대화를 시작할 수 있습니다</li>
          </ol>
        </div>

        {/* 네비게이션 */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-purple-600 hover:text-purple-800 text-sm underline">
            ← 메인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
