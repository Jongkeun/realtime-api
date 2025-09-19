import { useState, useEffect, useCallback } from 'react'

type PermissionState = 'granted' | 'denied' | 'prompt'

interface MicrophonePermissionResult {
  permission: PermissionState
  requestPermission: () => Promise<boolean>
  resetPermission: () => void
  isLoading: boolean
  error: string | null
}

export function useMicrophonePermission(): MicrophonePermissionResult {
  const [permission, setPermission] = useState<PermissionState>('prompt')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 권한 상태 확인
  const checkPermission = useCallback(async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ 
        name: 'microphone' as PermissionName 
      })
      setPermission(permissionStatus.state)

      permissionStatus.onchange = () => {
        setPermission(permissionStatus.state)
      }
    } catch (error) {
      console.log('권한 확인 실패:', error)
      // 권한 API가 지원되지 않는 경우 prompt으로 설정
      setPermission('prompt')
    }
  }, [])

  // 초기 권한 상태 확인
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  // 마이크 권한 요청
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('마이크 권한 요청 시작...')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      console.log('마이크 권한 승인됨')
      setPermission('granted')
      
      // 권한 확인용 스트림은 즉시 종료
      stream.getTracks().forEach(track => track.stop())
      
      return true
    } catch (error: unknown) {
      console.error('마이크 권한 요청 실패:', error)
      setPermission('denied')

      let errorMessage = '마이크 권한이 필요합니다.'
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.'
            break
          case 'NotFoundError':
            errorMessage = '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.'
            break
          case 'NotSupportedError':
            errorMessage = 'HTTPS 환경에서만 마이크를 사용할 수 있습니다.'
            break
          case 'NotReadableError':
            errorMessage = '마이크가 다른 애플리케이션에서 사용 중입니다.'
            break
          case 'OverconstrainedError':
            errorMessage = '요청된 마이크 제약 조건을 만족할 수 없습니다.'
            break
          default:
            errorMessage = `마이크 접근 실패: ${error.message}`
        }
      }

      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 권한 상태 재설정
  const resetPermission = useCallback(() => {
    setPermission('prompt')
    setError(null)
  }, [])

  return {
    permission,
    requestPermission,
    resetPermission,
    isLoading,
    error
  }
}