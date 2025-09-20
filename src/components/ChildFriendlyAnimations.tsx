'use client'

import { useEffect, useState } from 'react'

interface PulsingMicrophoneProps {
  isListening: boolean
  size?: 'small' | 'medium' | 'large'
}

export function PulsingMicrophone({ isListening, size = 'medium' }: PulsingMicrophoneProps) {
  const sizeClasses = {
    small: 'w-16 h-16 text-4xl',
    medium: 'w-24 h-24 text-6xl',
    large: 'w-32 h-32 text-8xl'
  }

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
      {/* 마이크 아이콘 */}
      <div className={`
        ${isListening 
          ? 'animate-pulse bg-red-100 text-red-500 shadow-lg shadow-red-200' 
          : 'bg-gray-100 text-gray-400'
        }
        rounded-full w-full h-full flex items-center justify-center
        transition-all duration-300
      `}>
        🎤
      </div>
      
      {/* 듣고 있을 때 파동 효과 */}
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full bg-red-300 opacity-30 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-red-200 opacity-20 animate-ping animation-delay-75" />
        </>
      )}
    </div>
  )
}

interface SpeakingCharacterProps {
  speaker: 'guest' | 'ai' | 'none'
}

export function SpeakingCharacter({ speaker }: SpeakingCharacterProps) {
  const [bounceCount, setBounceCount] = useState(0)

  useEffect(() => {
    if (speaker !== 'none') {
      const interval = setInterval(() => {
        setBounceCount(prev => prev + 1)
      }, 500)
      
      return () => clearInterval(interval)
    }
  }, [speaker])

  if (speaker === 'none') {
    return (
      <div className="text-8xl opacity-50 animate-pulse">
        😴
      </div>
    )
  }

  return (
    <div className="relative">
      <div className={`
        text-8xl transition-transform duration-300
        ${speaker === 'guest' ? 'animate-bounce' : speaker === 'ai' ? 'animate-pulse scale-110' : ''}
      `}>
        {speaker === 'guest' ? '👶' : '🤖'}
      </div>
      
      {/* 말하고 있을 때 효과 */}
      {(speaker as 'guest' | 'ai' | 'none') !== 'none' && (
        <div className="absolute -top-4 -right-4">
          <div className="relative">
            {/* 말풍선들 */}
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`
                  absolute w-3 h-3 bg-blue-400 rounded-full opacity-80
                  animate-bounce
                `}
                style={{
                  left: `${i * 8}px`,
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export function ChildFriendlyConnectionStatus({ status }: ConnectionStatusProps) {
  const statusConfig = {
    connecting: {
      emoji: '🔄',
      message: '친구를 찾고 있어요...',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      animation: 'animate-spin'
    },
    connected: {
      emoji: '🎉',
      message: '친구와 연결됐어요!',
      color: 'text-green-600',
      bg: 'bg-green-50',
      animation: 'animate-bounce'
    },
    disconnected: {
      emoji: '😴',
      message: '친구가 잠시 자리를 비웠어요',
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      animation: ''
    },
    error: {
      emoji: '😔',
      message: '앗, 문제가 생겼어요',
      color: 'text-red-600',
      bg: 'bg-red-50',
      animation: 'animate-pulse'
    }
  }

  const config = statusConfig[status]

  return (
    <div className={`${config.bg} rounded-2xl p-6 text-center border-2 border-opacity-20`}>
      <div className={`text-6xl mb-4 ${config.animation}`}>
        {config.emoji}
      </div>
      <p className={`text-xl font-semibold ${config.color}`}>
        {config.message}
      </p>
    </div>
  )
}

interface EncouragingMessagesProps {
  isVisible: boolean
}

export function EncouragingMessages({ isVisible }: EncouragingMessagesProps) {
  const messages = [
    { emoji: '👏', text: '잘하고 있어요!' },
    { emoji: '🌟', text: '정말 멋져요!' },
    { emoji: '🎈', text: '계속 말해보세요!' },
    { emoji: '🦄', text: '너무 재미있어요!' },
    { emoji: '🌈', text: '훌륭해요!' },
    { emoji: '⭐', text: '최고예요!' }
  ]

  const [currentMessage, setCurrentMessage] = useState(messages[0])
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)]
      setCurrentMessage(randomMessage)
      setShowMessage(true)

      const timer = setTimeout(() => {
        setShowMessage(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, messages])

  if (!showMessage) return null

  return (
    <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 text-center animate-bounce">
        <div className="text-4xl mb-2">{currentMessage.emoji}</div>
        <p className="text-lg font-bold text-purple-600">{currentMessage.text}</p>
      </div>
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* 중앙 얼굴 */}
        <div className="text-4xl animate-pulse">😊</div>
        
        {/* 회전하는 하트들 */}
        <div className="absolute inset-0 animate-spin">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute text-lg"
              style={{
                transform: `rotate(${i * 60}deg) translateY(-30px)`,
                transformOrigin: '50% 30px'
              }}
            >
              💝
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}