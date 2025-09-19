'use client'

import { useState, useEffect } from 'react'
import { useVoiceRelay } from '@/hooks/useVoiceRelay'

export default function HostPage() {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [connectionSteps, setConnectionSteps] = useState({
    audioReady: false,
    aiConnected: false,
    roomCreated: false,
    guestWaiting: true
  })

  const voiceRelay = useVoiceRelay()

  // 호스트 초기화
  const handleInitialize = async () => {
    setIsInitializing(true)
    setConnectionSteps(prev => ({ ...prev, audioReady: false, aiConnected: false, roomCreated: false }))

    try {
      const createdRoomId = await voiceRelay.initializeAsHost()
      if (createdRoomId) {
        setRoomId(createdRoomId)
        setConnectionSteps(prev => ({ 
          ...prev, 
          audioReady: true, 
          aiConnected: true, 
          roomCreated: true,
          guestWaiting: true 
        }))
      }
    } catch (error) {
      console.error('호스트 초기화 실패:', error)
    } finally {
      setIsInitializing(false)
    }
  }

  // 게스트 참여 감지 및 WebRTC 연결 시작
  useEffect(() => {
    if (voiceRelay.connectionState.remoteSocketId && voiceRelay.connectionState.role === 'host') {
      setConnectionSteps(prev => ({ ...prev, guestWaiting: false }))
      
      // WebRTC 연결 시작
      setTimeout(() => {
        voiceRelay.startWebRTCConnection()
      }, 1000)
    }
  }, [voiceRelay.connectionState.remoteSocketId, voiceRelay.connectionState.role, voiceRelay])

  // WebRTC 연결 완료 후 음성 릴레이 시작
  useEffect(() => {
    if (voiceRelay.webRTCState.connectionState === 'connected' && voiceRelay.isAIConnected) {
      setTimeout(() => {
        voiceRelay.startVoiceRelay()
      }, 500)
    }
  }, [voiceRelay.webRTCState.connectionState, voiceRelay.isAIConnected, voiceRelay])

  const getConnectionStatusColor = (isConnected: boolean, isWaiting: boolean = false) => {
    if (isWaiting) return 'text-yellow-600'
    return isConnected ? 'text-green-600' : 'text-red-600'
  }

  const getConnectionStatusText = (isConnected: boolean, isWaiting: boolean = false) => {
    if (isWaiting) return '대기 중...'
    return isConnected ? '연결됨' : '연결 안됨'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎤 음성 릴레이 호스트
          </h1>
          <p className="text-gray-600">
            아이와 AI의 실시간 대화를 중계하는 호스트 역할을 합니다
          </p>
        </div>

        {/* 초기화 버튼 */}
        {!roomId && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">시스템 초기화</h2>
            <button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 
                         text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isInitializing ? '초기화 중...' : '호스트 시작하기'}
            </button>
          </div>
        )}

        {/* 연결 상태 */}
        {roomId && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">연결 상태</h2>
            
            {/* 방 정보 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">방 코드</p>
              <p className="text-2xl font-mono font-bold text-blue-600">{roomId}</p>
              <p className="text-xs text-gray-500 mt-1">
                게스트가 이 코드로 참여할 수 있습니다
              </p>
            </div>

            {/* 시스템 상태 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">오디오 시스템</span>
                <span className={`text-sm font-semibold ${getConnectionStatusColor(connectionSteps.audioReady)}`}>
                  {getConnectionStatusText(connectionSteps.audioReady)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">AI 연결</span>
                <span className={`text-sm font-semibold ${getConnectionStatusColor(voiceRelay.isAIConnected)}`}>
                  {getConnectionStatusText(voiceRelay.isAIConnected)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">게스트 연결</span>
                <span className={`text-sm font-semibold ${getConnectionStatusColor(
                  voiceRelay.isGuestConnected, 
                  connectionSteps.guestWaiting
                )}`}>
                  {connectionSteps.guestWaiting 
                    ? '게스트 대기 중...' 
                    : getConnectionStatusText(voiceRelay.isGuestConnected)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">릴레이 활성</span>
                <span className={`text-sm font-semibold ${getConnectionStatusColor(voiceRelay.isRelayActive)}`}>
                  {getConnectionStatusText(voiceRelay.isRelayActive)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 현재 스피커 표시 */}
        {voiceRelay.isRelayActive && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">현재 대화 상태</h2>
            <div className="flex items-center justify-center p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <div className="text-center">
                {voiceRelay.currentSpeaker === 'guest' && (
                  <>
                    <div className="text-4xl mb-2">👶</div>
                    <p className="text-lg font-semibold text-blue-600">아이가 말하는 중...</p>
                  </>
                )}
                {voiceRelay.currentSpeaker === 'ai' && (
                  <>
                    <div className="text-4xl mb-2">🤖</div>
                    <p className="text-lg font-semibold text-green-600">AI가 응답하는 중...</p>
                  </>
                )}
                {voiceRelay.currentSpeaker === 'none' && (
                  <>
                    <div className="text-4xl mb-2">🔇</div>
                    <p className="text-lg font-semibold text-gray-500">대기 중...</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 에러 표시 */}
        {voiceRelay.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-semibold">오류 발생</h3>
                <p className="text-red-700 text-sm mt-1">{voiceRelay.error}</p>
              </div>
              <button
                onClick={voiceRelay.clearError}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 사용 방법 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-semibold mb-2">🔍 사용 방법</h3>
          <ol className="text-blue-700 text-sm space-y-1">
            <li>1. "호스트 시작하기" 버튼을 클릭하여 시스템을 초기화합니다</li>
            <li>2. 생성된 방 코드를 아이에게 알려주세요</li>
            <li>3. 아이가 게스트로 접속하면 자동으로 연결됩니다</li>
            <li>4. 연결이 완료되면 아이와 AI의 실시간 대화가 시작됩니다</li>
          </ol>
        </div>
      </div>
    </div>
  )
}