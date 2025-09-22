import { useEffect, useRef, useState } from "react";

// 🎛️ 애니메이션 설정 상수
const ANIMATION_CONFIG = {
  THROTTLE_MS: 16, // 60fps = 16.67ms
  SMOOTH_FACTOR: 0.15, // 부드러운 전환 계수
  THRESHOLD: 0.1, // 애니메이션 중단 임계값
} as const;

/**
 * 음성 레벨 애니메이션을 관리하는 커스텀 훅
 * - throttling으로 성능 최적화
 * - 부드러운 애니메이션 보간
 * - 메모리 누수 방지
 */
export function useVoiceAnimation(audioLevel: number, isActive: boolean) {
  const [animatedLevel, setAnimatedLevel] = useState(0);
  const animationRef = useRef<number>(0);
  const targetLevelRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);

  // 📊 audioLevel 업데이트를 throttle
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < ANIMATION_CONFIG.THROTTLE_MS) {
      return; // 빈번한 업데이트 무시
    }

    targetLevelRef.current = audioLevel;
    lastUpdateRef.current = now;
  }, [audioLevel]);

  // 🎬 애니메이션 루프 관리
  useEffect(() => {
    if (!isActive) {
      setAnimatedLevel(0);
      targetLevelRef.current = 0;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      return;
    }

    const animate = () => {
      setAnimatedLevel((prev) => {
        const target = targetLevelRef.current;
        const diff = target - prev;

        // 차이가 작으면 애니메이션 중단 (성능 최적화)
        if (Math.abs(diff) < ANIMATION_CONFIG.THRESHOLD) {
          return target;
        }

        const step = diff * ANIMATION_CONFIG.SMOOTH_FACTOR;
        return prev + step;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 🧹 cleanup: 메모리 누수 방지
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
    };
  }, [isActive]);

  return animatedLevel;
}