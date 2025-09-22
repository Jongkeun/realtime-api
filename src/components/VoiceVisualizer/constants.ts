// 🎨 시각적 설정 상수
export const VISUAL_CONFIG = {
  BAR_COUNT: 5,
  BAR_WIDTH: 4,
  MIN_BAR_HEIGHT: 4,
  MAX_BAR_HEIGHT: 32,
  AMPLIFICATION_FACTOR: 3, // 작은 음성 레벨 증폭
  ANIMATION_SPEED: 200, // sin 파형 애니메이션 속도
  OPACITY: {
    INACTIVE: 0.3,
    DIVISOR: 2, // 투명도 계산용
  },
} as const;

// 🎯 음성 상태 임계값
export const VOICE_THRESHOLDS = {
  SPEAKING: 0.15, // "말하는 중" 임계값
} as const;

// 🎨 스타일 클래스
export const STYLES = {
  BAR: "bg-green-500 rounded-full transition-all duration-100 ease-out",
  INDICATOR: {
    BASE: "w-3 h-3 rounded-full transition-all duration-300",
    SPEAKING: "bg-green-500 animate-pulse",
    LISTENING: "bg-yellow-500",
    INACTIVE: "bg-gray-400",
  },
  TEXT: "ml-2 text-sm font-medium text-gray-700",
  CONTAINER: "flex items-end justify-center space-x-1",
  BAR_CONTAINER: "flex items-end space-x-1 h-8",
  STATUS_CONTAINER: "ml-3 flex items-center",
} as const;

// 📝 상태 텍스트
export const STATUS_TEXT = {
  SPEAKING: "말하는 중...",
  LISTENING: "듣고 있어요",
  INACTIVE: "대기 중",
} as const;