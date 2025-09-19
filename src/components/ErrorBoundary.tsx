'use client'

import React, { Component, ReactNode } from 'react'
import { errorHandler, ErrorType, AppError } from '@/utils/errorHandler'

interface ErrorBoundaryState {
  hasError: boolean
  error: AppError | null
  errorId: string | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: AppError, retry: () => void) => ReactNode
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = errorHandler.createError(
      ErrorType.UNKNOWN_ERROR,
      error,
      true
    )

    return {
      hasError: true,
      error: appError,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // 에러 정보를 추가로 로깅
    errorHandler.createError(
      ErrorType.UNKNOWN_ERROR,
      `${error.message}\n\nComponent Stack: ${errorInfo.componentStack}`,
      true
    )
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // 사용자 정의 fallback이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry)
      }

      // 기본 에러 UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">😔</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              앗, 문제가 발생했어요!
            </h1>
            <p className="text-gray-600 mb-6">
              {this.state.error.userMessage}
            </p>
            
            {this.state.error.isRecoverable && (
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors mb-4"
              >
                다시 시도하기
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              페이지 새로고침
            </button>

            {/* 개발 모드에서만 에러 상세 정보 표시 */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  개발자 정보
                </summary>
                <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-40">
                  <div className="mb-2">
                    <strong>Error ID:</strong> {this.state.errorId}
                  </div>
                  <div className="mb-2">
                    <strong>Type:</strong> {this.state.error.type}
                  </div>
                  <div>
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 특정 컴포넌트용 에러 바운더리들
export function SocketErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(error, retry) => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
          <div className="flex items-center">
            <div className="text-red-400 mr-3 text-2xl">🔌</div>
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold">연결 문제 발생</h3>
              <p className="text-red-700 text-sm mt-1">{error.userMessage}</p>
            </div>
            {error.isRecoverable && (
              <button
                onClick={retry}
                className="ml-3 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                재연결
              </button>
            )}
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

export function AudioErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(error, retry) => (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
          <div className="flex items-center">
            <div className="text-yellow-400 mr-3 text-2xl">🎤</div>
            <div className="flex-1">
              <h3 className="text-yellow-800 font-semibold">음성 처리 문제</h3>
              <p className="text-yellow-700 text-sm mt-1">{error.userMessage}</p>
            </div>
            {error.isRecoverable && (
              <button
                onClick={retry}
                className="ml-3 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

// 전체 앱을 감싸는 글로벌 에러 바운더리
export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}