import { useCallback, useEffect, useRef, useState } from 'react'
import { useSocket } from './useSocket'
import { useWebRTC } from './useWebRTC'
import { useOpenAIRealtime } from './useOpenAIRealtime'
import { AudioProcessor } from '@/utils/audioProcessor'

interface VoiceRelayState {
  isHostReady: boolean
  isGuestConnected: boolean
  isAIConnected: boolean
  isRelayActive: boolean
  currentSpeaker: 'guest' | 'ai' | 'none'
  error: string | null
}

export function useVoiceRelay() {
  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const [relayState, setRelayState] = useState<VoiceRelayState>({
    isHostReady: false,
    isGuestConnected: false,
    isAIConnected: false,
    isRelayActive: false,
    currentSpeaker: 'none',
    error: null
  })

  // 각 모듈 훅 사용
  const { socket, connectionState, createRoom, joinRoom } = useSocket()
  const webRTC = useWebRTC(socket, connectionState.role, connectionState.remoteSocketId)
  const openAI = useOpenAIRealtime()

  // 오디오 프로세서 초기화
  useEffect(() => {
    const processor = new AudioProcessor()
    audioProcessorRef.current = processor
    
    return () => {
      processor.cleanup()
    }
  }, [])

  // 상태 업데이트
  useEffect(() => {
    setRelayState(prev => ({
      ...prev,
      isHostReady: connectionState.role === 'host' && connectionState.isConnected,
      isGuestConnected: connectionState.role === 'guest' && webRTC.isConnected,
      isAIConnected: openAI.isConnected && openAI.isSessionActive,
      isRelayActive: webRTC.isConnected && openAI.isConnected,
      error: webRTC.connectionState === 'failed' ? 'WebRTC 연결 실패' : openAI.lastError
    }))
  }, [
    connectionState,
    webRTC.isConnected,
    webRTC.connectionState,
    openAI.isConnected,
    openAI.isSessionActive,
    openAI.lastError
  ])

  // 호스트: 방 생성 및 시스템 초기화
  const initializeAsHost = useCallback(async (): Promise<string | null> => {
    try {
      // 오디오 프로세서 초기화
      const processor = audioProcessorRef.current
      if (!processor) {
        throw new Error('오디오 프로세서가 초기화되지 않았습니다')
      }

      const audioInitialized = await processor.initializeAudioContext()
      if (!audioInitialized) {
        throw new Error('오디오 컨텍스트 초기화 실패')
      }

      // OpenAI 연결
      const aiConnected = await openAI.connectToOpenAI()
      if (!aiConnected) {
        throw new Error('OpenAI 연결 실패')
      }

      // 소켓 방 생성
      return new Promise((resolve, reject) => {
        createRoom((roomId) => {
          console.log('호스트 초기화 완료, 방 ID:', roomId)
          resolve(roomId)
        })
        
        // 타임아웃 설정
        setTimeout(() => {
          reject(new Error('방 생성 타임아웃'))
        }, 5000)
      })
    } catch (error) {
      console.error('호스트 초기화 실패:', error)
      setRelayState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '호스트 초기화 실패'
      }))
      return null
    }
  }, [createRoom, openAI])

  // 게스트: 방 참여
  const joinAsGuest = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      // 오디오 프로세서 초기화
      const processor = audioProcessorRef.current
      if (!processor) {
        throw new Error('오디오 프로세서가 초기화되지 않았습니다')
      }

      const audioInitialized = await processor.initializeAudioContext()
      if (!audioInitialized) {
        throw new Error('오디오 컨텍스트 초기화 실패')
      }

      // 소켓 방 참여
      return new Promise((resolve, reject) => {
        joinRoom(roomId, (success, error) => {
          if (success) {
            console.log('게스트 참여 완료, 방 ID:', roomId)
            resolve(true)
          } else {
            reject(new Error(error || '방 참여 실패'))
          }
        })
        
        // 타임아웃 설정
        setTimeout(() => {
          reject(new Error('방 참여 타임아웃'))
        }, 5000)
      })
    } catch (error) {
      console.error('게스트 참여 실패:', error)
      setRelayState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '게스트 참여 실패'
      }))
      return false
    }
  }, [joinRoom])

  // WebRTC 연결 시작 (호스트가 게스트 참여 후 호출)
  const startWebRTCConnection = useCallback(async () => {
    if (connectionState.role !== 'host' || !connectionState.remoteSocketId) {
      console.warn('호스트가 아니거나 원격 소켓이 없습니다')
      return
    }

    try {
      await webRTC.createOffer()
      console.log('WebRTC 연결 시작됨')
    } catch (error) {
      console.error('WebRTC 연결 시작 실패:', error)
      setRelayState(prev => ({
        ...prev,
        error: 'WebRTC 연결 시작 실패'
      }))
    }
  }, [connectionState.role, connectionState.remoteSocketId, webRTC])

  // 음성 릴레이 시작 (호스트 전용)
  const startVoiceRelay = useCallback(() => {
    if (connectionState.role !== 'host' || !webRTC.remoteStream) {
      console.warn('호스트가 아니거나 원격 스트림이 없습니다')
      return
    }

    const processor = audioProcessorRef.current
    if (!processor) {
      console.error('오디오 프로세서가 없습니다')
      return
    }

    try {
      // 게스트로부터 받은 음성을 OpenAI로 전송하도록 설정
      processor.setupInputProcessor(webRTC.remoteStream, (audioBuffer) => {
        setRelayState(prev => ({ ...prev, currentSpeaker: 'guest' }))
        openAI.sendAudioData(audioBuffer)
      })

      console.log('음성 릴레이 시작됨')
      setRelayState(prev => ({ ...prev, isRelayActive: true }))
    } catch (error) {
      console.error('음성 릴레이 시작 실패:', error)
      setRelayState(prev => ({
        ...prev,
        error: '음성 릴레이 시작 실패'
      }))
    }
  }, [connectionState.role, webRTC.remoteStream, openAI])

  // OpenAI 응답을 게스트로 전송하기 위한 오디오 스트림 생성
  const setupAIAudioOutput = useCallback(() => {
    if (connectionState.role !== 'host') return null

    const processor = audioProcessorRef.current
    if (!processor) return null

    return processor.createOutputProcessor()
  }, [connectionState.role])

  // 에러 클리어
  const clearError = useCallback(() => {
    setRelayState(prev => ({ ...prev, error: null }))
  }, [])

  // 전체 시스템 정리
  const cleanup = useCallback(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.cleanup()
    }
    openAI.disconnect()
  }, [openAI])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.cleanup()
      }
      openAI.disconnect()
    }
  }, [])

  return {
    // 상태
    ...relayState,
    connectionState,
    webRTCState: {
      localStream: webRTC.localStream,
      remoteStream: webRTC.remoteStream,
      connectionState: webRTC.connectionState
    },
    openAIState: {
      isConnected: openAI.isConnected,
      conversationId: openAI.conversationId
    },

    // 액션
    initializeAsHost,
    joinAsGuest,
    startWebRTCConnection,
    startVoiceRelay,
    setupAIAudioOutput,
    clearError,
    cleanup
  }
}