import { useCallback, useEffect, useRef, useState } from 'react'
import { errorHandler, ErrorType, AppError } from '@/utils/errorHandler'

interface ConnectionRecoveryState {
  isRecovering: boolean
  recoveryAttempts: number
  lastRecoveryTime: Date | null
  autoRecoveryEnabled: boolean
}

export function useConnectionRecovery() {
  const [recoveryState, setRecoveryState] = useState<ConnectionRecoveryState>({
    isRecovering: false,
    recoveryAttempts: 0,
    lastRecoveryTime: null,
    autoRecoveryEnabled: true
  })

  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const networkCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // 네트워크 상태 모니터링
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log('네트워크 연결 복구됨')
      
      // 네트워크 복구 시 자동 재연결 시도
      if (recoveryState.autoRecoveryEnabled && !recoveryState.isRecovering) {
        setTimeout(() => {
          triggerAutoRecovery()
        }, 1000) // 1초 후 재연결 시도
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.warn('네트워크 연결 끊김')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 주기적 네트워크 상태 확인 (30초마다)
    networkCheckIntervalRef.current = setInterval(async () => {
      if (isOnline) {
        const isActuallyOnline = await errorHandler.checkNetworkConnectivity()
        if (!isActuallyOnline && isOnline) {
          setIsOnline(false)
        }
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (networkCheckIntervalRef.current) {
        clearInterval(networkCheckIntervalRef.current)
      }
    }
  }, [isOnline, recoveryState.autoRecoveryEnabled, recoveryState.isRecovering])

  // 자동 복구 트리거
  const triggerAutoRecovery = useCallback(async () => {
    if (recoveryState.isRecovering) return

    setRecoveryState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryAttempts: prev.recoveryAttempts + 1
    }))

    try {
      // 네트워크 연결 확인
      const isConnected = await errorHandler.checkNetworkConnectivity()
      if (!isConnected) {
        throw new Error('네트워크 연결 없음')
      }

      // 복구 성공
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        lastRecoveryTime: new Date()
      }))

      console.log('자동 복구 성공')
    } catch (error) {
      console.error('자동 복구 실패:', error)
      
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false
      }))

      // 지수 백오프로 재시도 스케줄링
      const backoffDelay = Math.min(1000 * Math.pow(2, recoveryState.recoveryAttempts), 30000) // 최대 30초
      recoveryTimeoutRef.current = setTimeout(triggerAutoRecovery, backoffDelay)
    }
  }, [recoveryState.isRecovering, recoveryState.recoveryAttempts])

  // 수동 복구 시도
  const manualRecovery = useCallback(async (recoveryActions: (() => Promise<void>)[] = []) => {
    if (recoveryState.isRecovering) return false

    setRecoveryState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryAttempts: 0 // 수동 복구는 카운트 리셋
    }))

    try {
      // 네트워크 연결 확인
      const isConnected = await errorHandler.checkNetworkConnectivity()
      if (!isConnected) {
        throw new Error('네트워크 연결을 확인해주세요')
      }

      // 복구 액션들 순차 실행
      for (const action of recoveryActions) {
        await action()
      }

      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        lastRecoveryTime: new Date()
      }))

      return true
    } catch (error) {
      console.error('수동 복구 실패:', error)
      
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false
      }))

      return false
    }
  }, [recoveryState.isRecovering])

  // 자동 복구 토글
  const toggleAutoRecovery = useCallback((enabled: boolean) => {
    setRecoveryState(prev => ({
      ...prev,
      autoRecoveryEnabled: enabled
    }))

    if (!enabled && recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current)
      recoveryTimeoutRef.current = null
    }
  }, [])

  // 복구 상태 리셋
  const resetRecoveryState = useCallback(() => {
    setRecoveryState({
      isRecovering: false,
      recoveryAttempts: 0,
      lastRecoveryTime: null,
      autoRecoveryEnabled: true
    })

    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current)
      recoveryTimeoutRef.current = null
    }
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current)
      }
      if (networkCheckIntervalRef.current) {
        clearInterval(networkCheckIntervalRef.current)
      }
    }
  }, [])

  return {
    // 상태
    isOnline,
    ...recoveryState,

    // 액션
    triggerAutoRecovery,
    manualRecovery,
    toggleAutoRecovery,
    resetRecoveryState
  }
}

// 연결 상태 모니터링 훅
export function useConnectionMonitor(
  connections: {
    socket?: boolean
    webrtc?: boolean
    openai?: boolean
  }
) {
  const [connectionHealth, setConnectionHealth] = useState({
    overall: 'healthy' as 'healthy' | 'degraded' | 'critical',
    issues: [] as string[]
  })

  useEffect(() => {
    const issues: string[] = []
    
    if (connections.socket === false) {
      issues.push('서버 연결 끊김')
    }
    
    if (connections.webrtc === false) {
      issues.push('음성 연결 불안정')
    }
    
    if (connections.openai === false) {
      issues.push('AI 연결 끊김')
    }

    const overall = 
      issues.length === 0 ? 'healthy' :
      issues.length <= 1 ? 'degraded' : 
      'critical'

    setConnectionHealth({ overall, issues })
  }, [connections.socket, connections.webrtc, connections.openai])

  return connectionHealth
}