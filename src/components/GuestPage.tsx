'use client'

import { useState, useEffect } from 'react'
import { useVoiceRelay } from '@/hooks/useVoiceRelay'
import { PulsingMicrophone, SpeakingCharacter, ChildFriendlyConnectionStatus, EncouragingMessages } from './ChildFriendlyAnimations'
import { SimpleVoiceIndicator } from './VoiceVisualization'
import { ParentalControlPanel, ContentFilterStatus, BreakTimeReminder } from './ChildSafetyFeatures'

interface GuestPageProps {
  roomId: string
}

export default function GuestPage({ roomId }: GuestPageProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [conversationStartTime] = useState(new Date())
  const [conversationTime, setConversationTime] = useState(0)
  const [showBreakReminder, setShowBreakReminder] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [showEncouragement, setShowEncouragement] = useState(false)

  const voiceRelay = useVoiceRelay()

  // 대화 시간 추적
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (hasJoined && voiceRelay.isRelayActive) {
      interval = setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - conversationStartTime.getTime()) / 1000)
        setConversationTime(elapsed)
        
        // 15분마다 휴식 권장
        if (elapsed > 0 && elapsed % (15 * 60) === 0) {
          setShowBreakReminder(true)
        }
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [hasJoined, voiceRelay.isRelayActive, conversationStartTime])

  // 격려 메시지 표시 (5개 메시지마다)
  useEffect(() => {
    if (messageCount > 0 && messageCount % 5 === 0) {
      setShowEncouragement(true)
      setTimeout(() => setShowEncouragement(false), 3000)
    }
  }, [messageCount])

  // 현재 스피커 변화 감지하여 메시지 카운트
  useEffect(() => {
    if (voiceRelay.currentSpeaker === 'ai') {
      setMessageCount(prev => prev + 1)
    }
  }, [voiceRelay.currentSpeaker])

  // 마이크 권한 확인
  useEffect(() => {
    checkMicrophonePermission()
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setMicrophonePermission(permission.state)
      
      permission.onchange = () => {
        setMicrophonePermission(permission.state)
      }
    } catch (error) {
      console.log('권한 확인 실패:', error)
    }
  }

  // 방 참여
  const handleJoinRoom = async () => {
    setIsJoining(true)

    try {
      // 마이크 권한 요청
      if (microphonePermission !== 'granted') {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
          setMicrophonePermission('granted')
        } catch (error) {
          setMicrophonePermission('denied')
          throw new Error('마이크 권한이 필요합니다')
        }
      }

      // 방 참여
      const joined = await voiceRelay.joinAsGuest(roomId)
      if (joined) {
        setHasJoined(true)
      }
    } catch (error) {
      console.error('방 참여 실패:', error)
    } finally {
      setIsJoining(false)
    }
  }

  // 연결 상태에 따른 메시지
  const getConnectionMessage = () => {
    if (!hasJoined) return null
    
    if (!voiceRelay.webRTCState.localStream) {
      return { type: 'info', message: '마이크 연결 중...' }
    }
    
    if (voiceRelay.webRTCState.connectionState === 'connecting') {
      return { type: 'info', message: '호스트와 연결 중...' }
    }
    
    if (voiceRelay.webRTCState.connectionState === 'connected') {
      return { type: 'success', message: 'AI 친구와 대화할 준비가 되었어요!' }
    }
    
    if (voiceRelay.webRTCState.connectionState === 'failed') {
      return { type: 'error', message: '연결에 실패했어요. 다시 시도해주세요.' }
    }
    
    return { type: 'info', message: '연결 준비 중...' }
  }

  const connectionMessage = getConnectionMessage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎈</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            AI 친구와 놀아요!
          </h1>
          <p className="text-gray-600 text-lg">
            마이크로 말하면 AI 친구가 대답해줘요
          </p>
        </div>

        {/* 방 참여 전 */}
        {!hasJoined && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🚪</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                방 참여하기
              </h2>
              <p className="text-gray-600">
                방 코드: <span className="font-mono font-bold text-purple-600">{roomId}</span>
              </p>
            </div>

            {/* 마이크 권한 상태 */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🎤</div>
                  <span className="font-medium">마이크 권한</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  microphonePermission === 'granted' 
                    ? 'bg-green-100 text-green-800' 
                    : microphonePermission === 'denied'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {microphonePermission === 'granted' ? '허용됨' : 
                   microphonePermission === 'denied' ? '거부됨' : '필요함'}
                </span>
              </div>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={isJoining}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 
                         disabled:from-gray-400 disabled:to-gray-400 
                         text-white font-bold py-4 px-6 rounded-xl text-lg transition-all
                         transform hover:scale-105 disabled:transform-none"
            >
              {isJoining ? '참여 중...' : '🎉 참여하기!'}
            </button>

            {microphonePermission === 'denied' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  마이크 권한이 필요해요. 브라우저 설정에서 마이크 권한을 허용해주세요.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 방 참여 후 */}
        {hasJoined && (
          <>
            {/* 연결 상태 */}
            {connectionMessage && (
              <div className={`rounded-2xl p-6 mb-6 text-center ${
                connectionMessage.type === 'success' 
                  ? 'bg-green-50 border-2 border-green-200' 
                  : connectionMessage.type === 'error'
                  ? 'bg-red-50 border-2 border-red-200'
                  : 'bg-blue-50 border-2 border-blue-200'
              }`}>
                <div className="text-4xl mb-3">
                  {connectionMessage.type === 'success' ? '🎉' : 
                   connectionMessage.type === 'error' ? '😢' : '⏳'}
                </div>
                <p className={`text-lg font-semibold ${
                  connectionMessage.type === 'success' ? 'text-green-800' :
                  connectionMessage.type === 'error' ? 'text-red-800' : 'text-blue-800'
                }`}>
                  {connectionMessage.message}
                </p>
              </div>
            )}

            {/* 향상된 대화 상태 표시 */}
            {voiceRelay.isRelayActive && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="text-center mb-6">
                  <SpeakingCharacter 
                    speaker={
                      voiceRelay.currentSpeaker === 'guest' ? 'child' :
                      voiceRelay.currentSpeaker === 'ai' ? 'ai' : 'none'
                    } 
                  />
                  <p className="text-xl font-bold text-gray-800 mb-2">
                    {voiceRelay.currentSpeaker === 'guest' ? '말하고 있어요...' : 
                     voiceRelay.currentSpeaker === 'ai' ? 'AI가 대답하는 중...' : '들을 준비가 되었어요!'}
                  </p>
                  <p className="text-gray-600 mb-4">
                    {voiceRelay.currentSpeaker === 'guest' ? '계속 말해보세요!' : 
                     voiceRelay.currentSpeaker === 'ai' ? '잠시만 기다려주세요...' : '마이크에 대고 말해보세요!'}
                  </p>
                </div>

                {/* 음성 시각화 */}
                <div className="flex justify-center mb-4">
                  <SimpleVoiceIndicator 
                    isActive={voiceRelay.currentSpeaker !== 'none'}
                    speaker={voiceRelay.currentSpeaker === 'guest' ? 'child' : 'ai'}
                  />
                </div>

                {/* 마이크 상태 */}
                <div className="flex justify-center">
                  <PulsingMicrophone 
                    isListening={voiceRelay.currentSpeaker === 'guest'}
                    size="medium"
                  />
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
          </>
        )}

        {/* 에러 표시 */}
        {voiceRelay.error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-400 mr-3 text-2xl">😔</div>
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold">앗, 문제가 생겼어요!</h3>
                <p className="text-red-700 text-sm mt-1">{voiceRelay.error}</p>
              </div>
              <button
                onClick={voiceRelay.clearError}
                className="text-red-400 hover:text-red-600 text-xl"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 아이 친화적 기능들 */}
      <EncouragingMessages isVisible={showEncouragement} />
      
      {/* 안전 기능들 */}
      <ParentalControlPanel
        onVolumeChange={(volume) => {
          // 볼륨 조절 로직 구현 필요
          console.log('Volume changed:', volume)
        }}
        onMute={(muted) => {
          // 음소거 로직 구현 필요
          console.log('Muted:', muted)
        }}
        onEmergencyStop={() => {
          voiceRelay.cleanup()
          setHasJoined(false)
        }}
        conversationTime={conversationTime}
      />

      {/* 컨텐츠 필터 상태 */}
      <div className="fixed bottom-4 left-4">
        <ContentFilterStatus 
          isActive={true} 
          blockedWordsCount={0} 
        />
      </div>

      {/* 휴식 시간 알림 */}
      {showBreakReminder && (
        <BreakTimeReminder
          onDismiss={() => setShowBreakReminder(false)}
          onTakeBreak={() => {
            voiceRelay.cleanup()
            setShowBreakReminder(false)
            setHasJoined(false)
          }}
        />
      )}
    </div>
  )
}