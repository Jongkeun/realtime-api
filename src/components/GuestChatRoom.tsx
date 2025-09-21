"use client";

import VoiceVisualizer from "@/components/VoiceVisualizer";
import ConnectionStatus from "@/components/ConnectionStatus";
import Link from "next/link";
import { VoiceRelayClient } from "@/hooks/useVoiceRelayGuest";

interface Props {
  voiceRelay: VoiceRelayClient;
}

export default function GuestChatRoom({ voiceRelay }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎈</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">AI 친구와 놀아요!</h1>
          <p className="text-gray-600 text-lg">마이크로 말하면 AI 친구가 대답해줘요</p>
        </div>

        {/* 연결 상태 */}
        <ConnectionStatus voiceRelay={voiceRelay} />

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
