import React from "react";
import { VISUAL_CONFIG, STYLES } from "./constants";

interface VoiceWaveformProps {
  animatedLevel: number;
  isActive: boolean;
}

export function VoiceWaveform({ animatedLevel, isActive }: VoiceWaveformProps) {
  const bars = Array.from({ length: VISUAL_CONFIG.BAR_COUNT }, (_, index) => {
    const amplifiedLevel = animatedLevel * VISUAL_CONFIG.AMPLIFICATION_FACTOR;

    const sinWave = 1 + Math.sin(Date.now() / VISUAL_CONFIG.ANIMATION_SPEED + index) * 0.3;
    const calculatedHeight = amplifiedLevel * 20 * sinWave;
    const barHeight = Math.max(VISUAL_CONFIG.MIN_BAR_HEIGHT, Math.min(VISUAL_CONFIG.MAX_BAR_HEIGHT, calculatedHeight));

    const opacity = isActive
      ? Math.min(1, amplifiedLevel / VISUAL_CONFIG.OPACITY.DIVISOR + VISUAL_CONFIG.OPACITY.INACTIVE)
      : VISUAL_CONFIG.OPACITY.INACTIVE;

    return (
      <div
        key={index}
        className={STYLES.BAR}
        style={{
          height: `${barHeight}px`,
          width: `${VISUAL_CONFIG.BAR_WIDTH}px`,
          opacity,
          transform: `scaleY(${isActive ? 1 : 0.3})`,
        }}
      />
    );
  });

  return <div className={STYLES.BAR_CONTAINER}>{bars}</div>;
}
