export enum ErrorType {
  SOCKET_CONNECTION = 'SOCKET_CONNECTION',
  WEBRTC_CONNECTION = 'WEBRTC_CONNECTION',
  OPENAI_CONNECTION = 'OPENAI_CONNECTION',
  AUDIO_PERMISSION = 'AUDIO_PERMISSION',
  AUDIO_PROCESSING = 'AUDIO_PROCESSING',
  ROOM_JOIN = 'ROOM_JOIN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType
  message: string
  isRecoverable: boolean
  userMessage: string
  retryAction?: () => Promise<void>
  timestamp: Date
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errorHistory: AppError[] = []
  
  // 최대 저장할 에러 개수
  private readonly MAX_ERROR_HISTORY = 50
  
  // 재시도 관련 설정
  private readonly RETRY_DELAYS = [1000, 2000, 5000, 10000] // 1초, 2초, 5초, 10초
  private readonly MAX_RETRY_ATTEMPTS = 3

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  // 에러 생성 및 처리
  createError(
    type: ErrorType,
    originalError: Error | string,
    isRecoverable: boolean = true,
    retryAction?: () => Promise<void>
  ): AppError {
    const message = typeof originalError === 'string' ? originalError : originalError.message
    
    const appError: AppError = {
      type,
      message,
      isRecoverable,
      userMessage: this.generateUserFriendlyMessage(type, message),
      retryAction,
      timestamp: new Date()
    }

    this.addToHistory(appError)
    this.logError(appError)

    return appError
  }

  // 사용자 친화적 메시지 생성
  private generateUserFriendlyMessage(type: ErrorType, message: string): string {
    switch (type) {
      case ErrorType.SOCKET_CONNECTION:
        return '서버와의 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.'
      
      case ErrorType.WEBRTC_CONNECTION:
        return '음성 연결에 문제가 발생했습니다. 네트워크 상태를 확인해주세요.'
      
      case ErrorType.OPENAI_CONNECTION:
        return 'AI와의 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.'
      
      case ErrorType.AUDIO_PERMISSION:
        return '마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.'
      
      case ErrorType.AUDIO_PROCESSING:
        return '음성 처리 중 문제가 발생했습니다. 마이크 상태를 확인해주세요.'
      
      case ErrorType.ROOM_JOIN:
        return '방 참여에 실패했습니다. 방 코드를 확인하거나 다시 시도해주세요.'
      
      case ErrorType.NETWORK_ERROR:
        return '네트워크 연결을 확인하고 다시 시도해주세요.'
      
      default:
        return '예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }
  }

  // 에러 히스토리에 추가
  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error)
    
    // 최대 개수 초과 시 오래된 에러 제거
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_ERROR_HISTORY)
    }
  }

  // 에러 로깅
  private logError(error: AppError): void {
    console.error(`[${error.type}] ${error.message}`, {
      timestamp: error.timestamp,
      isRecoverable: error.isRecoverable,
      userMessage: error.userMessage
    })
  }

  // 재시도 로직
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorType: ErrorType,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts
        
        if (isLastAttempt) {
          throw this.createError(
            errorType,
            error instanceof Error ? error : new Error(String(error)),
            false
          )
        }

        // 재시도 전 대기
        const delay = this.RETRY_DELAYS[Math.min(attempt - 1, this.RETRY_DELAYS.length - 1)]
        await this.sleep(delay)
        
        console.warn(`재시도 ${attempt}/${maxAttempts} (${delay}ms 대기 후)`)
      }
    }

    throw new Error('This should never be reached')
  }

  // 네트워크 상태 확인
  async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      })
      return response.ok
    } catch {
      return false
    }
  }

  // 특정 타입의 에러 개수 반환
  getErrorCount(type: ErrorType, timeWindowMs?: number): number {
    let errors = this.errorHistory.filter(error => error.type === type)
    
    if (timeWindowMs) {
      const cutoffTime = new Date(Date.now() - timeWindowMs)
      errors = errors.filter(error => error.timestamp > cutoffTime)
    }
    
    return errors.length
  }

  // 최근 에러 반환
  getRecentErrors(count: number = 5): AppError[] {
    return this.errorHistory.slice(0, count)
  }

  // 특정 에러 타입이 최근에 발생했는지 확인
  hasRecentError(type: ErrorType, timeWindowMs: number = 30000): boolean {
    const cutoffTime = new Date(Date.now() - timeWindowMs)
    return this.errorHistory.some(
      error => error.type === type && error.timestamp > cutoffTime
    )
  }

  // 에러 히스토리 초기화
  clearHistory(): void {
    this.errorHistory = []
  }

  // 유틸리티: sleep 함수
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 전역 에러 핸들러 인스턴스
export const errorHandler = ErrorHandler.getInstance()

// 특정 에러 타입들을 위한 헬퍼 함수들
export const createSocketError = (error: Error | string, retryAction?: () => Promise<void>) =>
  errorHandler.createError(ErrorType.SOCKET_CONNECTION, error, true, retryAction)

export const createWebRTCError = (error: Error | string, retryAction?: () => Promise<void>) =>
  errorHandler.createError(ErrorType.WEBRTC_CONNECTION, error, true, retryAction)

export const createOpenAIError = (error: Error | string, retryAction?: () => Promise<void>) =>
  errorHandler.createError(ErrorType.OPENAI_CONNECTION, error, true, retryAction)

export const createAudioPermissionError = (error: Error | string) =>
  errorHandler.createError(ErrorType.AUDIO_PERMISSION, error, false)

export const createNetworkError = (error: Error | string, retryAction?: () => Promise<void>) =>
  errorHandler.createError(ErrorType.NETWORK_ERROR, error, true, retryAction)