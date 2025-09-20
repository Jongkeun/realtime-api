"use client";

import { useState, useEffect } from "react";
import { useVoiceRelay } from "@/hooks/useVoiceRelay";
import { useSocket } from "@/hooks/useSocket";
import { useMicrophonePermission } from "@/hooks/useMicrophonePermission";
import VoiceVisualizer from "@/components/VoiceVisualizer";
import Link from "next/link";

export default function GuestPage() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const voiceRelay = useVoiceRelay();
  const { socket, roomList, getRoomList } = useSocket();
  const microphone = useMicrophonePermission();

  // 페이지 로드 시 방 목록 가져오기
  useEffect(() => {
    if (socket) {
      // 방 목록 요청
      getRoomList((rooms) => {
        setLoadingRooms(false);
      });
    }
  }, [socket]);

  // join 성공 후 로컬 스트림을 소비
  useEffect(() => {
    if (hasJoined && voiceRelay.webRTCState.localStream) {
      const audioEl = document.createElement("audio");
      audioEl.srcObject = voiceRelay.webRTCState.localStream;
      audioEl.muted = true; // 스피커로는 안 나옴
      audioEl.play().catch((err) => console.warn("로컬 스트림 play 실패:", err));
      document.body.appendChild(audioEl);
      console.log("🎤 게스트 로컬 스트림 소비용 <audio> 태그 추가됨");

      voiceRelay.webRTCState.localStream?.getAudioTracks().forEach((track) => {
        console.log("🎙 게스트 트랙 상태:", {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });

      return () => {
        audioEl.srcObject = null;
        audioEl.remove();
        console.log("🎤 게스트 로컬 스트림 소비용 <audio> 태그 제거됨");
      };
    }
  }, [hasJoined, voiceRelay.webRTCState.localStream]);

  // 방 목록이 업데이트되면 로딩 상태 해제
  useEffect(() => {
    if (roomList.length > 0) {
      setLoadingRooms(false);
    }
  }, [roomList]);

  // 방 참여
  const handleJoinRoom = async () => {
    if (!selectedRoomId) return;

    setIsJoining(true);

    try {
      // 마이크 권한 요청
      const permissionGranted = await microphone.requestPermission();
      if (!permissionGranted) {
        throw new Error(microphone.error || "마이크 권한이 필요합니다.");
      }

      // 방 참여
      const joined = await voiceRelay.joinAsGuest(selectedRoomId);
      if (joined) {
        setHasJoined(true);
      }
    } catch (error) {
      console.error("방 참여 실패:", error);
    } finally {
      setIsJoining(false);
    }
  };

  // 연결 상태에 따른 메시지
  const getConnectionMessage = () => {
    if (!hasJoined) return null;

    if (!voiceRelay.webRTCState.localStream) {
      return { type: "info", message: "마이크 연결 중..." };
    }

    if (voiceRelay.webRTCState.connectionState === "connecting") {
      return { type: "info", message: "호스트와 연결 중..." };
    }

    if (voiceRelay.webRTCState.connectionState === "connected") {
      return { type: "success", message: "AI 친구와 대화할 준비가 되었어요!" };
    }

    if (voiceRelay.webRTCState.connectionState === "failed") {
      return { type: "error", message: "연결에 실패했어요. 다시 시도해주세요." };
    }

    return { type: "info", message: "연결 준비 중..." };
  };

  const connectionMessage = getConnectionMessage();

  // 방 참여 후 대화 UI
  if (hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
        <div className="max-w-md mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎈</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">AI 친구와 놀아요!</h1>
            <p className="text-gray-600 text-lg">마이크로 말하면 AI 친구가 대답해줘요</p>
          </div>

          {/* 연결 상태 */}
          {connectionMessage && (
            <div
              className={`rounded-2xl p-6 mb-6 text-center ${
                connectionMessage.type === "success"
                  ? "bg-green-50 border-2 border-green-200"
                  : connectionMessage.type === "error"
                  ? "bg-red-50 border-2 border-red-200"
                  : "bg-blue-50 border-2 border-blue-200"
              }`}
            >
              <div className="text-4xl mb-3">
                {connectionMessage.type === "success" ? "🎉" : connectionMessage.type === "error" ? "😢" : "⏳"}
              </div>
              <p
                className={`text-lg font-semibold ${
                  connectionMessage.type === "success"
                    ? "text-green-800"
                    : connectionMessage.type === "error"
                    ? "text-red-800"
                    : "text-blue-800"
                }`}
              >
                {connectionMessage.message}
              </p>
            </div>
          )}

          {/* 대화 상태 표시 */}
          {voiceRelay.webRTCState.connectionState === "connected" && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">
                  {voiceRelay.currentSpeaker === "guest" ? "👦" : voiceRelay.currentSpeaker === "ai" ? "🤖" : "🔇"}
                </div>
                <p className="text-xl font-bold text-gray-800 mb-2">
                  {voiceRelay.currentSpeaker === "guest"
                    ? "말하고 있어요..."
                    : voiceRelay.currentSpeaker === "ai"
                    ? "AI가 대답하는 중..."
                    : "들을 준비가 되었어요!"}
                </p>
                <p className="text-gray-600 mb-4">
                  {voiceRelay.currentSpeaker === "guest"
                    ? "계속 말해보세요!"
                    : voiceRelay.currentSpeaker === "ai"
                    ? "잠시만 기다려주세요..."
                    : "마이크에 대고 말해보세요!"}
                </p>

                {/* 실시간 음성 시각화 */}
                <div className="flex justify-center mt-6">
                  <VoiceVisualizer
                    isActive={voiceRelay.webRTCState.connectionState === "connected"}
                    audioLevel={voiceRelay.microphoneLevel}
                    className="bg-gray-50 rounded-xl p-4"
                  />
                </div>

                {/* 게스트 디버깅 정보 */}
                <div className="text-center mt-4">
                  <p className="text-xs text-blue-600">
                    Guest Debug: micLevel = {voiceRelay.microphoneLevel?.toFixed(1) || 0}
                  </p>
                  <p className="text-xs text-green-600">
                    WebRTC: {voiceRelay.webRTCState.connectionState} | Connected:{" "}
                    {voiceRelay.webRTCState.connectionState === "connected" ? "true" : "false"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 사용법 안내 */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">💡</span>
              어떻게 사용하나요?
            </h3>
            <div className="space-y-2 text-gray-700">
              <p className="flex items-start">
                <span className="mr-2">1️⃣</span>
                <span>마이크에 대고 자연스럽게 말해보세요</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2">2️⃣</span>
                <span>AI 친구가 여러분의 말을 듣고 대답해줄 거예요</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2">3️⃣</span>
                <span>대화를 계속 이어나가며 재미있게 놀아요!</span>
              </p>
            </div>
          </div>

          {/* 에러 표시 */}
          {voiceRelay.error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center">
                <div className="text-red-400 mr-3 text-2xl">😔</div>
                <div className="flex-1">
                  <h3 className="text-red-800 font-semibold">앗, 문제가 생겼어요!</h3>
                  <p className="text-red-700 text-sm mt-1">{voiceRelay.error}</p>
                </div>
                <button onClick={voiceRelay.clearError} className="text-red-400 hover:text-red-600 text-xl">
                  ✕
                </button>
              </div>
            </div>
          )}

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
