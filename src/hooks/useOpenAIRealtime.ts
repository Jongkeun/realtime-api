import { useEffect, useRef, useState, useCallback } from 'react'
import type { RealtimeEvent, SessionConfig } from '@/types/openai'
import { CHILD_FRIENDLY_INSTRUCTIONS } from '@/types/openai'

// OpenAI Realtime API 설정 상수
const REALTIME_API_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01'
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  modalities: ['text', 'audio'],
  instructions: CHILD_FRIENDLY_INSTRUCTIONS,
  voice: 'nova', // 아이들에게 친근한 목소리
  input_audio_format: 'pcm16',
  output_audio_format: 'pcm16',
  input_audio_transcription: {
    model: 'whisper-1'
  },
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500
  },
  temperature: 0.8,
  max_response_output_tokens: 'inf'
}

interface RealtimeState {
  isConnected: boolean
  isSessionActive: boolean
  lastError: string | null
  conversationId: string | null
}

export function useOpenAIRealtime() {
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    isConnected: false,
    isSessionActive: false,
    lastError: null,
    conversationId: null
  })

  // WebSocket 연결 초기화
  const connectToOpenAI = useCallback(async () => {
    if (!OPENAI_API_KEY) {
      const errorMessage = 'OpenAI API 키가 설정되지 않았습니다'
      setRealtimeState(prev => ({
        ...prev,
        lastError: errorMessage
      }))
      console.error(errorMessage)
      return false
    }

    try {
      const websocket = new WebSocket(REALTIME_API_URL, ['realtime', 'json'])
      
      // 인증 헤더는 WebSocket 연결 시 추가할 수 없으므로 연결 후 첫 메시지에 포함
      websocket.addEventListener('open', () => {
        console.log('OpenAI Realtime API 연결 성공')
        setRealtimeState(prev => ({
          ...prev,
          isConnected: true,
          lastError: null
        }))
        
        // 세션 설정
        const sessionUpdateEvent: RealtimeEvent = {
          type: 'session.update',
          session: DEFAULT_SESSION_CONFIG
        }
        websocket.send(JSON.stringify(sessionUpdateEvent))
      })

      websocket.addEventListener('message', (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data)
          handleRealtimeEvent(data)
        } catch (error) {
          console.error('메시지 파싱 오류:', error)
        }
      })

      websocket.addEventListener('close', (event) => {
        console.log('OpenAI 연결 종료:', event.code, event.reason)
        setRealtimeState(prev => ({
          ...prev,
          isConnected: false,
          isSessionActive: false
        }))
      })

      websocket.addEventListener('error', (error) => {
        console.error('OpenAI 연결 오류:', error)
        setRealtimeState(prev => ({
          ...prev,
          lastError: 'OpenAI 연결에 실패했습니다',
          isConnected: false
        }))
      })

      wsRef.current = websocket
      return true
    } catch (error) {
      console.error('OpenAI 연결 실패:', error)
      setRealtimeState(prev => ({
        ...prev,
        lastError: '연결 초기화에 실패했습니다'
      }))
      return false
    }
  }, [])

  // Realtime API 이벤트 처리
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    console.log('Realtime 이벤트:', event.type)

    switch (event.type) {
      case 'session.created':
        setRealtimeState(prev => ({
          ...prev,
          isSessionActive: true,
          conversationId: event.session?.id || null
        }))
        console.log('세션 생성됨:', event.session?.id)
        break

      case 'session.updated':
        console.log('세션 업데이트됨')
        break

      case 'error':
        setRealtimeState(prev => ({
          ...prev,
          lastError: event.error?.message || 'OpenAI API 오류'
        }))
        console.error('OpenAI 오류:', event.error)
        break

      case 'response.audio.delta':
        // 오디오 응답 스트리밍 처리
        handleAudioResponse(event.delta)
        break

      case 'response.text.done':
        console.log('텍스트 응답 완료:', event.text)
        break

      case 'conversation.item.input_audio_transcription.completed':
        console.log('음성 인식 완료:', event.transcript)
        break

      default:
        // 기타 이벤트 로깅
        break
    }
  }, [])

  // 오디오 응답 처리
  const handleAudioResponse = useCallback((audioDelta: string) => {
    // base64 오디오 데이터를 AudioBuffer로 변환하여 재생
    // 이 부분은 실제 오디오 재생 로직 구현 필요
    console.log('오디오 응답 수신, 길이:', audioDelta.length)
  }, [])

  // 오디오 데이터 전송
  const sendAudioData = useCallback((audioData: ArrayBuffer) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket이 연결되어 있지 않습니다')
      return
    }

    // PCM16 오디오를 base64로 인코딩
    const base64Audio = arrayBufferToBase64(audioData)
    
    const audioEvent: RealtimeEvent = {
      type: 'input_audio_buffer.append',
      audio: base64Audio
    }

    wsRef.current.send(JSON.stringify(audioEvent))
  }, [])

  // 대화 시작
  const startConversation = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('OpenAI에 연결되어 있지 않습니다')
      return
    }

    const commitEvent: RealtimeEvent = {
      type: 'input_audio_buffer.commit'
    }

    const responseEvent: RealtimeEvent = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: '아이와 친근하게 대화해주세요.'
      }
    }

    wsRef.current.send(JSON.stringify(commitEvent))
    wsRef.current.send(JSON.stringify(responseEvent))
  }, [])

  // 연결 해제
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    ...realtimeState,
    connectToOpenAI,
    sendAudioData,
    startConversation,
    disconnect
  }
}

// ArrayBuffer를 base64로 변환하는 유틸리티 함수
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000 // 32KB 청크로 처리
  let base64 = ''
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    base64 += btoa(String.fromCharCode.apply(null, Array.from(chunk)))
  }
  
  return base64
}