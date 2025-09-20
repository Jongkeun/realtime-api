"use client";

import { useEffect, useRef, useState } from "react";

interface VoiceVisualizerProps {
  isActive: boolean;
  audioLevel?: number; // 0-100 범위의 음성 레벨
  className?: string;
}

export function VoiceVisualizer({ isActive, audioLevel = 0, className = "" }: VoiceVisualizerProps) {
  const [animatedLevel, setAnimatedLevel] = useState(0);
  const animationRef = useRef<number>(0);

  // 부드러운 애니메이션을 위한 레벨 보간
  useEffect(() => {
    if (!isActive) {
      setAnimatedLevel(0);
      return;
    }

    const animate = () => {
      setAnimatedLevel((prev) => {
        const diff = audioLevel - prev;
        const step = diff * 0.2; // 부드러운 전환을 위한 보간 계수
        return prev + step;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel]);

  // 파형 바 생성 (5개의 바)
  const bars = Array.from({ length: 5 }, (_, index) => {
    const barHeight = Math.max(4, (animatedLevel / 100) * 32 * (1 + Math.sin(Date.now() / 200 + index) * 0.3));
    const opacity = isActive ? Math.min(1, animatedLevel / 50 + 0.3) : 0.3;

    return (
      <div
        key={index}
        className="bg-green-500 rounded-full transition-all duration-100 ease-out"
        style={{
          height: `${barHeight}px`,
          width: "4px",
          opacity,
          transform: `scaleY(${isActive ? 1 : 0.3})`,
        }}
      />
    );
  });

  return (
    <div className={`flex items-end justify-center space-x-1 ${className}`}>
      <div className="flex items-end space-x-1 h-8">{bars}</div>

      {/* 상태 표시 */}
      <div className="ml-3 flex items-center">
        <div
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            isActive && animatedLevel > 10 ? "bg-green-500 animate-pulse" : isActive ? "bg-yellow-500" : "bg-gray-400"
          }`}
        />
        <span className="ml-2 text-sm font-medium text-gray-700">
          {isActive && animatedLevel > 10 ? "말하는 중..." : isActive ? "듣고 있어요" : "대기 중"}
        </span>
      </div>
    </div>
  );
}

export default VoiceVisualizer;
