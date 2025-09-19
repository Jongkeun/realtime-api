export interface RealtimeAPIConfig {
  model: "gpt-4o-realtime-preview-2024-10-01";
  modalities: ["text", "audio"];
  instructions: string;
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  input_audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
  output_audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
  input_audio_transcription?: {
    model: "whisper-1";
  };
  turn_detection?: {
    type: "server_vad";
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
  tools?: Array<{
    type: "function";
    name: string;
    description: string;
    parameters: object;
  }>;
  tool_choice: "auto" | "none" | "required";
  temperature: number;
  max_response_output_tokens: number | "inf";
}

export interface RealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: unknown;
}

export interface AudioData {
  audio: string; // base64 encoded audio
}

// 아이 친화적 AI 설정을 위한 상수
export const CHILD_FRIENDLY_INSTRUCTIONS = `
당신은 3-7세 아이들과 대화하는 친근하고 따뜻한 AI 친구입니다.

지침:
- 아이의 눈높이에 맞는 쉽고 간단한 단어를 사용하세요
- 밝고 긍정적인 톤으로 대화하세요  
- 아이의 말을 잘 들어주고 공감해주세요
- 호기심을 자극하는 질문을 해주세요
- 부적절한 내용은 절대 말하지 마세요
- 아이가 이해하기 어려우면 쉽게 다시 설명해주세요
- 창의력과 상상력을 키워주는 대화를 해주세요

말투 예시:
"안녕! 나는 너의 친구야~ 오늘 뭐 하고 놀았어?"
"와! 정말 멋진데? 더 자세히 들려줄래?"
"그렇구나~ 정말 재미있겠다!"
`;
