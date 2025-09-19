"use client";

import { useState } from "react";
import HostPage from "@/components/HostPage";
import GuestPage from "@/components/GuestPage";

export default function HomePage() {
  const [userType, setUserType] = useState<"none" | "host" | "guest">("none");
  const [guestRoomId, setGuestRoomId] = useState("");

  const handleSelectHost = () => {
    setUserType("host");
  };

  const handleSelectGuest = () => {
    if (!guestRoomId.trim()) {
      alert("방 코드를 입력해주세요!");
      return;
    }
    setUserType("guest");
  };

  const handleGoBack = () => {
    setUserType("none");
    setGuestRoomId("");
  };

  // 호스트 페이지
  if (userType === "host") {
    return (
      <div>
        <button
          onClick={handleGoBack}
          className="fixed top-4 left-4 bg-white shadow-lg hover:shadow-xl 
                     px-4 py-2 rounded-lg font-medium text-gray-700 hover:text-gray-900 
                     transition-all z-10"
        >
          ← 돌아가기
        </button>
        <HostPage />
      </div>
    );
  }

  // 게스트 페이지
  if (userType === "guest") {
    return (
      <div>
        <button
          onClick={handleGoBack}
          className="fixed top-4 left-4 bg-white shadow-lg hover:shadow-xl 
                     px-4 py-2 rounded-lg font-medium text-gray-700 hover:text-gray-900 
                     transition-all z-10"
        >
          ← 돌아가기
        </button>
        <GuestPage roomId={guestRoomId} />
      </div>
    );
  }

  // 메인 선택 페이지
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-teal-100">
      <div className="container mx-auto px-4 py-16">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="text-8xl mb-6">🎭</div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Dubu 음성 대화</h1>
          <p className="text-xl text-gray-600 mb-2">3-7세 아이와 AI가 실시간으로 대화하는 특별한 경험</p>
          <p className="text-gray-500">호스트가 아이와 AI 사이의 대화를 안전하게 중계합니다</p>
        </div>

        {/* 역할 선택 */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* 호스트 카드 */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">👨‍💼</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">호스트</h2>
                <p className="text-gray-600">아이와 AI의 대화를 중계하는 역할</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-700">
                  <span className="mr-3">✅</span>
                  <span>방을 생성하고 관리</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="mr-3">✅</span>
                  <span>OpenAI와 실시간 연결</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="mr-3">✅</span>
                  <span>음성 데이터 중계 처리</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="mr-3">✅</span>
                  <span>연결 상태 모니터링</span>
                </div>
              </div>

              <button
                onClick={handleSelectHost}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 
                           text-white font-bold py-4 px-6 rounded-xl text-lg transition-all
                           transform hover:scale-105"
              >
                호스트로 시작하기
              </button>
            </div>

            {/* 게스트 카드 */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">👶</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">게스트 (아이)</h2>
                <p className="text-gray-600">AI 친구와 대화를 나누는 역할</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-700">
                  <span className="mr-3">🎤</span>
                  <span>마이크로 자연스럽게 대화</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="mr-3">🤖</span>
                  <span>AI 친구의 음성 응답 듣기</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="mr-3">🎈</span>
                  <span>아이 친화적인 인터페이스</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="mr-3">🔒</span>
                  <span>안전한 대화 환경</span>
                </div>
              </div>

              {/* 방 코드 입력 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">방 코드 입력</label>
                <input
                  type="text"
                  value={guestRoomId}
                  onChange={(e) => setGuestRoomId(e.target.value)}
                  placeholder="예: abc123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                             focus:ring-2 focus:ring-purple-500 focus:border-transparent 
                             text-center font-mono text-lg"
                />
              </div>

              <button
                onClick={handleSelectGuest}
                disabled={!guestRoomId.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 
                           disabled:from-gray-400 disabled:to-gray-400
                           text-white font-bold py-4 px-6 rounded-xl text-lg transition-all
                           transform hover:scale-105 disabled:transform-none"
              >
                게스트로 참여하기
              </button>
            </div>
          </div>
        </div>

        {/* 설명 섹션 */}
        <div className="max-w-3xl mx-auto mt-16">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">🔄 시스템 작동 방식</h3>

            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl mb-3">🎤</div>
                <h4 className="font-semibold text-gray-800 mb-2">1. 음성 입력</h4>
                <p className="text-gray-600 text-sm">아이가 마이크에 대고 자연스럽게 말합니다</p>
              </div>

              <div>
                <div className="text-4xl mb-3">🔄</div>
                <h4 className="font-semibold text-gray-800 mb-2">2. 실시간 중계</h4>
                <p className="text-gray-600 text-sm">호스트가 음성을 OpenAI로 안전하게 전달합니다</p>
              </div>

              <div>
                <div className="text-4xl mb-3">🔊</div>
                <h4 className="font-semibold text-gray-800 mb-2">3. AI 응답</h4>
                <p className="text-gray-600 text-sm">AI가 아이 친화적인 목소리로 대답합니다</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
