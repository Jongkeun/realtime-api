// 오디오 처리를 위한 상수들
export const INPUT_TARGET_SAMPLE_RATE = 16000; // OpenAI Realtime 입력 권장 (PCM16)
export const OUTPUT_SAMPLE_RATE = 24000; // OpenAI Realtime 출력(PCM16) 기본
export const BUFFER_SIZE = 4096;
export const CHANNELS = 1; // 모노
export const MIN_SPEECH_MS = 1000; // 최소 1초
export const MIN_SAMPLES = INPUT_TARGET_SAMPLE_RATE * (MIN_SPEECH_MS / 1000); // 16000
export const MIN_BYTES = MIN_SAMPLES * 2; // PCM16 (2바이트)
