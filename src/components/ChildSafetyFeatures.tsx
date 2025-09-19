'use client'

import { useEffect, useState } from 'react'

interface ParentalControlPanelProps {
  onVolumeChange: (volume: number) => void
  onMute: (muted: boolean) => void
  onEmergencyStop: () => void
  conversationTime: number
}

export function ParentalControlPanel({ 
  onVolumeChange, 
  onMute, 
  onEmergencyStop, 
  conversationTime 
}: ParentalControlPanelProps) {
  const [volume, setVolume] = useState(70)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(false)

  // 대화 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    onVolumeChange(newVolume / 100)
  }

  const handleMute = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    onMute(newMutedState)
  }

  // 15분 후 자동 알림
  const shouldShowTimeWarning = conversationTime > 15 * 60 // 15분

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* 컨트롤 토글 버튼 */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors mb-2"
        title="부모 컨트롤"
      >
        ⚙️
      </button>

      {/* 컨트롤 패널 */}
      {showControls && (
        <div className="bg-white rounded-lg shadow-2xl p-4 w-64 border">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">부모 컨트롤</h3>
          
          {/* 대화 시간 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              대화 시간
            </label>
            <div className={`text-2xl font-mono font-bold ${
              shouldShowTimeWarning ? 'text-orange-600' : 'text-green-600'
            }`}>
              {formatTime(conversationTime)}
            </div>
            {shouldShowTimeWarning && (
              <p className="text-xs text-orange-600 mt-1">
                충분히 대화했어요! 휴식을 고려해보세요.
              </p>
            )}
          </div>

          {/* 볼륨 조절 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              볼륨: {volume}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 음소거 */}
          <button
            onClick={handleMute}
            className={`w-full mb-3 py-2 px-4 rounded-lg font-medium transition-colors ${
              isMuted 
                ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {isMuted ? '🔇 음소거 해제' : '🔊 음소거'}
          </button>

          {/* 비상 정지 */}
          <button
            onClick={onEmergencyStop}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            🛑 대화 중단
          </button>
        </div>
      )}
    </div>
  )
}

interface ContentFilterStatusProps {
  isActive: boolean
  blockedWordsCount: number
}

export function ContentFilterStatus({ isActive, blockedWordsCount }: ContentFilterStatusProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      <div className="flex items-center">
        <div className="text-green-600 mr-2">🛡️</div>
        <div>
          <h4 className="text-green-800 font-semibold text-sm">안전 필터</h4>
          <p className="text-green-700 text-xs">
            {isActive ? '활성화됨' : '비활성화됨'} • {blockedWordsCount}개 단어 차단됨
          </p>
        </div>
      </div>
    </div>
  )
}

interface SessionSummaryProps {
  startTime: Date
  endTime: Date
  totalMessages: number
  averageResponseTime: number
}

export function SessionSummary({ startTime, endTime, totalMessages, averageResponseTime }: SessionSummaryProps) {
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
  
  return (
    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
      <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
        <span className="mr-2">📊</span>
        오늘의 대화 요약
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{durationMinutes}분</div>
          <div className="text-sm text-blue-700">대화 시간</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalMessages}개</div>
          <div className="text-sm text-blue-700">메시지</div>
        </div>
        
        <div className="text-center col-span-2">
          <div className="text-xl font-bold text-blue-600">{averageResponseTime.toFixed(1)}초</div>
          <div className="text-sm text-blue-700">평균 응답 시간</div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100">
        <p className="text-sm text-gray-700 text-center">
          🌟 오늘도 AI 친구와 즐거운 시간을 보냈네요!
        </p>
      </div>
    </div>
  )
}

export function BreakTimeReminder({ onDismiss, onTakeBreak }: {
  onDismiss: () => void
  onTakeBreak: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
        <div className="text-6xl mb-4">☕</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          잠깐 쉬어갈까요?
        </h3>
        <p className="text-gray-600 mb-6">
          15분 동안 대화를 나눴어요!<br />
          잠깐 휴식을 취하는 것도 좋겠어요.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onTakeBreak}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
          >
            휴식하기 🌿
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-xl transition-colors"
          >
            조금 더 할래요
          </button>
        </div>
      </div>
    </div>
  )
}