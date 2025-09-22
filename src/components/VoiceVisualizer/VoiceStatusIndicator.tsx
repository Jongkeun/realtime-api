import React from "react";
import { VOICE_THRESHOLDS, STYLES, STATUS_TEXT } from "./constants";

interface VoiceStatusIndicatorProps {
  animatedLevel: number;
  isActive: boolean;
}

export function VoiceStatusIndicator({ animatedLevel, isActive }: VoiceStatusIndicatorProps) {
  const isSpeaking = isActive && animatedLevel > VOICE_THRESHOLDS.SPEAKING;
  const isListening = isActive && !isSpeaking;

  const indicatorClass = (() => {
    if (isSpeaking) return STYLES.INDICATOR.SPEAKING;
    if (isListening) return STYLES.INDICATOR.LISTENING;
    return STYLES.INDICATOR.INACTIVE;
  })();

  const statusText = (() => {
    if (isSpeaking) return STATUS_TEXT.SPEAKING;
    if (isListening) return STATUS_TEXT.LISTENING;
    return STATUS_TEXT.INACTIVE;
  })();

  return (
    <div className={STYLES.STATUS_CONTAINER}>
      <div className={`${STYLES.INDICATOR.BASE} ${indicatorClass}`} />
      <span className={STYLES.TEXT}>{statusText}</span>
    </div>
  );
}
