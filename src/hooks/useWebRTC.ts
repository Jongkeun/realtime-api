import { useEffect, useRef, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents, UserRole } from '@/types/socket'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// WebRTC 설정 상수
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000
  },
  video: false
}

interface WebRTCState {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isConnected: boolean
  connectionState: RTCPeerConnectionState
}

export function useWebRTC(
  socket: TypedSocket | null,
  role: UserRole | null,
  remoteSocketId: string | null
) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const [webrtcState, setWebRTCState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isConnected: false,
    connectionState: 'new'
  })

  // 로컬 미디어 스트림 초기화
  const initializeLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS)
      setWebRTCState(prev => ({
        ...prev,
        localStream: stream
      }))
      return stream
    } catch (error) {
      console.error('미디어 스트림 접근 실패:', error)
      return null
    }
  }, [])

  // Peer Connection 초기화
  const initializePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION)
    peerConnectionRef.current = peerConnection

    // 연결 상태 모니터링
    peerConnection.onconnectionstatechange = () => {
      const currentConnectionState = peerConnection.connectionState
      setWebRTCState(prev => ({
        ...prev,
        connectionState: currentConnectionState,
        isConnected: currentConnectionState === 'connected'
      }))
      console.log('WebRTC 연결 상태:', currentConnectionState)
    }

    // 원격 스트림 수신
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      setWebRTCState(prev => ({
        ...prev,
        remoteStream
      }))
      console.log('원격 스트림 수신됨')
    }

    // ICE candidate 처리
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket && remoteSocketId) {
        socket.emit('ice-candidate', event.candidate, remoteSocketId)
      }
    }

    return peerConnection
  }, [socket, remoteSocketId])

  // Offer 생성 (Host용)
  const createOffer = useCallback(async () => {
    if (!socket || !remoteSocketId || role !== 'host') return

    const peerConnection = initializePeerConnection()
    const localStream = await initializeLocalStream()
    
    if (!localStream) return

    // 로컬 스트림을 Peer Connection에 추가
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream)
    })

    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      socket.emit('offer', offer, remoteSocketId)
      console.log('Offer 생성 및 전송 완료')
    } catch (error) {
      console.error('Offer 생성 실패:', error)
    }
  }, [socket, remoteSocketId, role, initializePeerConnection, initializeLocalStream])

  // Answer 생성 (Guest용)
  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit, fromSocketId: string) => {
    if (!socket || role !== 'guest') return

    const peerConnection = initializePeerConnection()
    const localStream = await initializeLocalStream()
    
    if (!localStream) return

    // 로컬 스트림을 Peer Connection에 추가
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream)
    })

    try {
      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket.emit('answer', answer, fromSocketId)
      console.log('Answer 생성 및 전송 완료')
    } catch (error) {
      console.error('Answer 생성 실패:', error)
    }
  }, [socket, role, initializePeerConnection, initializeLocalStream])

  // Answer 처리 (Host용)
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current || role !== 'host') return

    try {
      await peerConnectionRef.current.setRemoteDescription(answer)
      console.log('Answer 처리 완료')
    } catch (error) {
      console.error('Answer 처리 실패:', error)
    }
  }, [role])

  // ICE Candidate 처리
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate) => {
    if (!peerConnectionRef.current) return

    try {
      await peerConnectionRef.current.addIceCandidate(candidate)
      console.log('ICE candidate 추가 완료')
    } catch (error) {
      console.error('ICE candidate 추가 실패:', error)
    }
  }, [])

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!socket) return

    socket.on('offer', createAnswer)
    socket.on('answer', handleAnswer)
    socket.on('ice-candidate', handleIceCandidate)

    return () => {
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
    }
  }, [socket, createAnswer, handleAnswer, handleIceCandidate])

  // 정리
  useEffect(() => {
    return () => {
      if (webrtcState.localStream) {
        webrtcState.localStream.getTracks().forEach(track => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [webrtcState.localStream])

  return {
    ...webrtcState,
    createOffer,
    initializeLocalStream
  }
}