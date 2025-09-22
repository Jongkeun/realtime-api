"use client";

import React from "react";
import { useVoiceAnimation } from "@/hooks/useVoiceAnimation";
import { VoiceWaveform, VoiceStatusIndicator, STYLES } from "./VoiceVisualizer/index";

interface VoiceVisualizerProps {
  isActive: boolean;
  audioLevel?: number; // 0-100 범위의 음성 레벨
  className?: string;
}

export function VoiceVisualizer({ isActive, audioLevel = 0, className = "" }: VoiceVisualizerProps) {
  const animatedLevel = useVoiceAnimation(audioLevel, isActive);

  return (
    <div className={`${STYLES.CONTAINER} ${className}`}>
      <VoiceWaveform animatedLevel={animatedLevel} isActive={isActive} />
      <VoiceStatusIndicator animatedLevel={animatedLevel} isActive={isActive} />
    </div>
  );
}

export default VoiceVisualizer;
