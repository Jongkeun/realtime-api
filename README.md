## 🚀 실행 방법 및 사용 설명

### 1. 환경 설정

**.env.local 파일 생성**

```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### 2. 의존성 설치 및 실행

```bash
# 의존성 설치
yarn install

# 개발 서버 실행
yarn dev

```

### 3. 상세 사용 방법

#### **호스트 (관리자) 역할**

1. **http://localhost:3000** 접속 (다른 디바이스에서 테스트하기 위해 프라이빗 ip 추천)
2. "호스트 시작하기" 선택
3. 호스트 이름 입력 (예: "엄마", "선생님")
4. "방 만들기" 버튼 클릭으로 새 방 생성
5. 생성된 방 코드를 게스트에게 공유
6. OpenAI API 자동 연결 대기
7. 게스트 접속 시 WebRTC P2P 연결 자동 시작
8. AI 대화 모니터링 및 필요시 개입 가능

#### **게스트 (아이) 역할**

1. **http://localhost:3000** 접속
2. "게스트 참여하기" 선택
3. 마이크 권한 허용 **필수**
4. 활성 방 목록에서 참여할 방 선택
5. WebRTC 연결 완료 후 AI "두부"와 자유로운 음성 대화

## 📊 구현한 범위 / 미구현 항목

### ✅ **구현된 기능**

#### **🎯 핵심 기능**

- OpenAI Realtime API 기반 실시간 AI 음성 대화
- WebRTC P2P를 통한 저지연 음성 통신
- Socket.io 기반 시그널링 및 방 관리 시스템
- 1:1 호스트-게스트 방 시스템

#### **🔊 오디오 시스템**

- 마이크 입력 캡처 및 실시간 전처리
- 브라우저 샘플레이트(48kHz) → OpenAI 입력(16kHz) → 출력(24kHz) 변환
- Float32 → PCM16 리얼타임 인코딩/디코딩
- 오디오 버퍼링 및 큐 관리 시스템

### ❌ **미구현 항목**

- AI 음성 최적화 (틱틱 끊기는 소리가 존재)

### 🎯 설계 및 구현 시 중점적으로 고려한 사항

- 비지니스 코드와 UI 코드 분리
- 최소한의 구현으로 요구사항 충족

## 🛠️ 기술 스택

### 프론트엔드

- **Next.js 15**: React 기반 풀스택 프레임워크
- **TypeScript**: 타입 안전성
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **Socket.io Client**: 실시간 통신

### 백엔드

- **Node.js**: 런타임
- **Socket.io**: WebRTC 시그널링 서버
- **Custom Server**: TypeScript 기반 커스텀 서버

### 실시간 기술

- **WebRTC**: P2P 음성 통신
- **OpenAI Realtime API**: AI 음성 대화
- **Web Audio API**: 음성 처리

## 🔧 기술적 도전과제와 해결책

### **1. Audio 태그 누락으로 인한 무음 문제**

#### **🚨 문제 상황**

```javascript
// 문제가 되는 코드 - MediaStream만으론 소리가 안 남
const audioStream = new MediaStream();
// DOM에 audio element 없이 재생 시도 → 실패
```

#### **✅ 해결 방법**

```javascript
// src/utils/webRTC.ts
export function setupAudioElement(stream: MediaStream, options: { muted: boolean }) {
  const audioEl = document.createElement("audio");
  audioEl.srcObject = stream; // MediaStream 연결
  audioEl.autoplay = true;
  audioEl.controls = false;
  audioEl.muted = options.muted; // 에코 방지용 음소거
  document.body.appendChild(audioEl); // DOM 추가 필수!
  return audioEl;
}
```

#### **📚 학습 포인트**

- **WebRTC MediaStream ≠ 자동 재생**: 반드시 HTML audio element 필요
- **DOM 추가 필수**: createElement만으론 부족, appendChild까지 해야 재생
- **autoplay 정책**: 사용자 인터랙션 후에만 가능 (버튼 클릭 등)
- **에코 방지**: 송신 측은 muted=true, 수신 측은 false

### **2. OpenAI와 브라우저 간 SAMPLE_RATE 호환성 문제**

#### **🚨 문제 상황**

```javascript
// 샘플레이트 미스매치로 인한 음질 저하/속도 변화
OpenAI Realtime API 요구사항:
- 입력: 16kHz PCM16 (모노)
- 출력: 24kHz PCM16 (모노)

브라우저 AudioContext 기본값:
- 대부분 48kHz (하드웨어 기본값)
- 일부 44.1kHz (CD 품질)
```

#### **✅ 해결 방법**

```javascript
// src/constants/audio.ts - 샘플레이트 표준화
export const INPUT_TARGET_SAMPLE_RATE = 16000;   // OpenAI 입력 최적화
export const OUTPUT_SAMPLE_RATE = 24000;         // OpenAI 출력 기본값
export const BUFFER_SIZE = 4096;                 // 처리 단위
export const CHANNELS = 1;                       // 모노 (스테레오 불필요)

// src/utils/audioProcessor.ts - 실시간 다운샘플링
private downsampleFloat32(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate >= inRate) return input.slice(); // 업샘플링 불필요

  const ratio = inRate / outRate; // 48000/16000 = 3
  const newLen = Math.floor(input.length / ratio);
  const result = new Float32Array(newLen);

  // 3샘플마다 1샘플씩 선택 (심플한 decimation)
  for (let i = 0; i < newLen; i++) {
    result[i] = input[Math.floor(i * ratio)] || 0;
  }
  return result;
}

// Float32 → PCM16 변환 (OpenAI 요구 포맷)
private floatToPCM16(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32[i])); // 클리핑 방지
    const pcmValue = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(i * 2, pcmValue, true); // 리틀 엔디안
  }
  return buffer;
}
```

#### **📚 학습 포인트**

- **샘플레이트 변환 필수**: API 요구사항과 브라우저 기본값 불일치 해결
- **실시간 처리**: 배치 처리가 아닌 스트리밍 방식으로 지연 최소화
- **품질 vs 성능**: 고품질 보간 대신 빠른 decimation 선택
- **데이터 포맷 변환**: Float32(브라우저) ↔ PCM16(OpenAI) 양방향 변환

### **3. WebRTC 연결 타이밍 및 안정성 문제**

#### **🚨 문제 상황**

```javascript
// 연결 상태 확인 없이 즉시 호출 → 실패
voiceRelay.startVoiceRelay(); // Error: AudioContext not ready
// Error: MediaStream not connected

// 고정 지연 사용 → 불안정
setTimeout(() => voiceRelay.startVoiceRelay(), 500); // 때로는 부족, 때로는 과함
```

#### **✅ 해결 방법**

```javascript
// src/hooks/useVoiceRelaySetup.ts - 적응형 재시도 메커니즘
useEffect(() => {
  if (voiceRelay.webRTCState.connectionState === "connected" && voiceRelay.isAIConnected) {
    // 이전 타이머 정리 (메모리 누수 방지)
    if (relayTimeoutRef.current) {
      clearTimeout(relayTimeoutRef.current);
    }

    // 동적 재시도 함수
    const checkAudioReadyAndStart = () => {
      try {
        voiceRelay.startVoiceRelay(); // 시도
        console.log("✅ 음성 릴레이 시작 성공");
      } catch (error) {
        console.warn("⚠️ 음성 릴레이 시작 재시도 중...", error);

        // 실패 시 100ms 후 재시도 (고정 지연보다 빠름)
        relayTimeoutRef.current = setTimeout(() => {
          if (voiceRelay.webRTCState.connectionState === "connected" && voiceRelay.isAIConnected) {
            checkAudioReadyAndStart(); // 재귀 호출로 계속 시도
          }
        }, 100);
      }
    };

    // 첫 시도는 200ms 후 (WebRTC 안정화 최소 시간)
    relayTimeoutRef.current = setTimeout(checkAudioReadyAndStart, 200);
  }

  // cleanup 함수 - 컴포넌트 언마운트 시 타이머 정리
  return () => {
    if (relayTimeoutRef.current) {
      clearTimeout(relayTimeoutRef.current);
    }
  };
}, [voiceRelay.webRTCState.connectionState, voiceRelay.isAIConnected, voiceRelay]);
```

#### **📚 학습 포인트**

- **연결 상태 기반 시작**: 상태 확인 후 안전한 시점에 시작
- **동적 재시도**: 고정 지연 대신 실패 시에만 재시도
- **리소스 관리**: useRef + cleanup으로 타이머 메모리 누수 방지
- **점진적 백오프**: 향후 지수 백오프 추가 고려 가능

## 📁 프로젝트 구조

```
realtime-api/
├── 📁 src/
│   ├── 📁 app/                     # Next.js App Router
│   │   ├── 📄 page.tsx            # 메인 페이지
│   │   ├── 📁 host/page.tsx       # 호스트 페이지
│   │   ├── 📁 guest/page.tsx      # 게스트 페이지
│   │   └── 📄 layout.tsx          # 전역 레이아웃
│   ├── 📁 components/             # React UI 컴포넌트
│   │   ├── 📁 host/               # 호스트 전용 컴포넌트
│   │   │   ├── PageHeader.tsx
│   │   │   ├── InitializationSection.tsx
│   │   │   ├── ConnectionStatus.tsx
│   │   │   └── ConversationStatus.tsx
│   │   ├── 📁 guest/              # 게스트 전용 컴포넌트
│   │   │   ├── RoomList.tsx
│   │   │   ├── JoinRoomSection.tsx
│   │   │   └── MicrophonePermissionStatus.tsx
│   │   └── 📁 guest-chat/         # 대화 중 UI 컴포넌트
│   │       ├── ConversationDisplay.tsx
│   │       ├── VoiceVisualizerSection.tsx
│   │       └── ErrorDisplay.tsx
│   ├── 📁 hooks/                  # 비즈니스 로직 커스텀 훅
│   │   ├── 🎯 useVoiceRelayHost.ts     # 호스트 음성 릴레이
│   │   ├── 🎯 useVoiceRelayGuest.ts    # 게스트 음성 수신
│   │   ├── 🌐 useWebRTCHost.ts         # 호스트 WebRTC
│   │   ├── 🌐 useWebRTCGuest.ts        # 게스트 WebRTC
│   │   ├── 🤖 useOpenAIRealtime.ts     # OpenAI API 연동
│   │   ├── 🔌 useSocket.ts             # Socket.io 연결
│   │   └── 🔧 useMicrophonePermission.ts
│   ├── 📁 server/                 # 서버사이드 모듈
│   │   ├── 📋 types.ts            # TypeScript 타입 정의
│   │   ├── 🤖 openai-connection.ts     # OpenAI API 연결
│   │   ├── 🏠 room-manager.ts          # 방 생성/관리
│   │   └── 🔌 socket-handlers.ts       # 소켓 이벤트 처리
│   ├── 📁 utils/                  # 유틸리티 함수
│   │   ├── 🔊 audioProcessor.ts        # 오디오 변환/처리
│   │   └── 🌐 webRTC.ts               # WebRTC 헬퍼
│   └── 📁 constants/
│       └── 🔊 audio.ts            # 오디오 관련 상수
├── 📁 prompts/
│   └── 🤖 system.ts              # AI 시스템 프롬프트 & 음성 설정
├── ⚡ server.ts                   # 메인 서버 진입점 (55줄)
├── ⚙️ next.config.ts             # Next.js 설정
├── 📋 package.json               # 의존성 및 스크립트
└── 📖 README.md                  # 프로젝트 문서
```
