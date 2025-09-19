'use client'

import { useEffect, useRef, useState } from 'react'

interface VoiceVisualizationProps {
  audioStream?: MediaStream | null
  isActive: boolean
  color?: 'blue' | 'green' | 'purple' | 'red'
}

export function VoiceVisualization({ audioStream, isActive, color = 'blue' }: VoiceVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)

  const colorSchemes = {
    blue: {
      primary: '#3B82F6',
      secondary: '#93C5FD',
      background: '#EFF6FF'
    },
    green: {
      primary: '#10B981',
      secondary: '#6EE7B7',
      background: '#ECFDF5'
    },
    purple: {
      primary: '#8B5CF6',
      secondary: '#C4B5FD',
      background: '#F5F3FF'
    },
    red: {
      primary: '#EF4444',
      secondary: '#FCA5A5',
      background: '#FEF2F2'
    }
  }

  // 오디오 분석 설정
  useEffect(() => {
    if (audioStream && isActive) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      const source = ctx.createMediaStreamSource(audioStream)
      
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      
      setAudioContext(ctx)
      analyserRef.current = analyser
      
      return () => {
        ctx.close()
        setAudioContext(null)
      }
    }
  }, [audioStream, isActive])

  // 시각화 애니메이션
  useEffect(() => {
    if (!analyserRef.current || !canvasRef.current || !isActive) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const scheme = colorSchemes[color]

    const draw = () => {
      if (!analyserRef.current || !isActive) return

      analyserRef.current.getByteFrequencyData(dataArray)
      
      // 캔버스 클리어
      ctx.fillStyle = scheme.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 바 그리기
      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8

        // 그라데이션 생성
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight)
        gradient.addColorStop(0, scheme.primary)
        gradient.addColorStop(1, scheme.secondary)
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }

      animationIdRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [isActive, color, colorSchemes])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={300}
        height={100}
        className="rounded-lg shadow-lg"
      />
      
      {/* 활성화되지 않았을 때 정적 표시 */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="flex space-x-1">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-2 bg-gray-300 rounded-full"
                style={{ height: `${Math.random() * 20 + 10}px` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SimpleVoiceIndicatorProps {
  isActive: boolean
  speaker: 'child' | 'ai'
}

export function SimpleVoiceIndicator({ isActive, speaker }: SimpleVoiceIndicatorProps) {
  const [bars] = useState(() => Array.from({ length: 5 }, () => Math.random() * 0.8 + 0.2))

  return (
    <div className="flex items-center justify-center space-x-2 h-16">
      {bars.map((baseHeight, i) => (
        <div
          key={i}
          className={`
            w-3 rounded-full transition-all duration-200 ease-in-out
            ${speaker === 'child' 
              ? isActive 
                ? 'bg-gradient-to-t from-blue-400 to-blue-600 animate-pulse' 
                : 'bg-blue-200'
              : isActive 
                ? 'bg-gradient-to-t from-green-400 to-green-600 animate-pulse' 
                : 'bg-green-200'
            }
          `}
          style={{
            height: isActive ? `${baseHeight * 60 + 20}px` : '12px',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  )
}