# 🎭 Dubu 실시간 음성 대화 시스템

3-7세 아이와 AI가 실시간으로 대화하는 음성 릴레이 시스템입니다. 호스트가 아이와 AI 사이의 대화를 안전하게 중계하며, WebRTC와 OpenAI Realtime API를 활용합니다.

## 🎯 프로젝트 개요

### 핵심 기능
- **실시간 음성 대화**: 아이가 말하면 AI가 즉시 음성으로 응답
- **안전한 중계 시스템**: 호스트를 통한 안전한 데이터 전송
- **아이 친화적 UI**: 3-7세 아동을 위한 직관적이고 재미있는 인터페이스
- **부모 관제 기능**: 대화 시간, 볼륨 조절, 비상 정지 등

### 시스템 아키텍처
```
게스트(아이) ←→ [WebRTC P2P] ←→ 호스트 ←→ [OpenAI Realtime API] ←→ AI
                                   ↓
                            [Socket.io 시그널링]
```

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 18.0 이상
- npm 또는 yarn
- 최신 브라우저 (Chrome, Safari, Firefox)
- 마이크 권한 허용

### 설치 및 실행

1. **의존성 설치**
```bash
npm install
```

2. **환경 변수 설정**
`.env.local` 파일에 OpenAI API 키 추가:
```env
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

3. **개발 서버 실행**
```bash
npm run dev
```

4. **브라우저에서 접속**
```
http://localhost:3000
```

## 📋 사용 방법

### 호스트 (관리자) 역할
1. 메인 페이지에서 "호스트로 시작하기" 선택
2. "호스트 시작하기" 버튼 클릭으로 시스템 초기화
3. 생성된 방 코드를 아이에게 알려주기
4. 아이가 접속하면 자동으로 WebRTC 연결 시작
5. 대화 상태 모니터링 및 필요시 개입

### 게스트 (아이) 역할
1. 메인 페이지에서 "게스트로 참여하기" 선택
2. 호스트에게 받은 방 코드 입력
3. 마이크 권한 허용
4. AI 친구와 자유롭게 대화

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

## 🏗️ 프로젝트 구조

```
src/
├── app/                    # Next.js 앱 라우터
│   ├── page.tsx           # 메인 페이지
│   └── layout.tsx         # 레이아웃
├── components/            # React 컴포넌트
│   ├── HostPage.tsx       # 호스트 페이지
│   ├── GuestPage.tsx      # 게스트 페이지
│   ├── ChildFriendlyAnimations.tsx  # 아이 친화적 애니메이션
│   ├── VoiceVisualization.tsx       # 음성 시각화
│   ├── ChildSafetyFeatures.tsx      # 안전 기능
│   └── ErrorBoundary.tsx            # 에러 바운더리
├── hooks/                 # 커스텀 훅
│   ├── useSocket.ts       # Socket.io 연결
│   ├── useWebRTC.ts       # WebRTC 관리
│   ├── useOpenAIRealtime.ts         # OpenAI API 연동
│   ├── useVoiceRelay.ts             # 통합 음성 릴레이
│   └── useConnectionRecovery.ts     # 연결 복구
├── types/                 # TypeScript 타입 정의
│   ├── socket.ts          # Socket.io 타입
│   └── openai.ts          # OpenAI API 타입
└── utils/                 # 유틸리티 함수
    ├── audioProcessor.ts  # 오디오 처리
    └── errorHandler.ts    # 에러 처리
```

## 🔧 설정 및 커스터마이징

### 환경 변수
| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_OPENAI_API_KEY` | OpenAI API 키 | ✅ |
| `PORT` | 서버 포트 (기본: 3000) | ❌ |

### OpenAI 설정
AI 응답은 3-7세 아동에 맞게 최적화되어 있습니다:
- 쉽고 친근한 말투
- 긍정적이고 격려하는 톤
- 부적절한 내용 필터링
- 호기심 자극하는 대화

### 오디오 설정
- **샘플레이트**: 16kHz (OpenAI 권장)
- **코덱**: Opus (WebRTC 기본)
- **에코 제거**: 활성화
- **노이즈 감소**: 활성화

## 🚨 문제 해결

### 자주 발생하는 문제들

#### 1. 마이크 권한 오류
```
해결방법: 브라우저 설정에서 마이크 권한 허용
Chrome: 설정 → 개인정보 및 보안 → 사이트 설정 → 마이크
```

#### 2. WebRTC 연결 실패
```
원인: 방화벽 또는 NAT 문제
해결방법: STUN 서버 설정 확인 또는 TURN 서버 추가
```

#### 3. OpenAI API 오류
```
확인사항:
- API 키 유효성
- 계정 잔액
- 서비스 상태
```

#### 4. 음성이 들리지 않음
```
체크리스트:
- 스피커/헤드폰 연결
- 브라우저 볼륨 설정
- 시스템 볼륨 확인
```

### 디버그 모드
개발 환경에서는 콘솔에 상세한 로그가 출력됩니다:
```bash
# 개발 모드로 실행
NODE_ENV=development npm run dev
```

## 🔒 보안 고려사항

### 데이터 보호
- 음성 데이터는 메모리에서만 처리, 저장하지 않음
- OpenAI API 통신은 HTTPS로 암호화
- 브라우저 간 P2P 연결로 중앙 서버 경유 최소화

### 아동 안전 기능
- 15분 대화 시간 제한 및 휴식 권장
- 부모 관제 패널 (볼륨, 시간, 비상정지)
- 부적절한 내용 필터링
- 격려 메시지 자동 표시

## 🧪 테스트

### 수동 테스트
1. **기본 플로우 테스트**
   - 호스트 초기화 → 게스트 참여 → 대화 진행

2. **연결 복구 테스트**
   - 네트워크 끊김 시뮬레이션
   - 브라우저 새로고침 후 재연결

3. **에러 시나리오 테스트**
   - 마이크 권한 거부
   - API 키 오류
   - 방 코드 오류

### 성능 테스트
- 지연 시간: 전체 라운드트립 < 2초 목표
- 음성 품질: 16kHz 샘플링 유지
- 메모리 사용량: 브라우저 메모리 누수 방지

## 🚀 배포

### 프로덕션 빌드
```bash
npm run build
npm start
```

### 배포 옵션
1. **Vercel**: 추천, WebSocket 제한 있음
2. **Railway**: 풀스택 지원
3. **Render**: 무료 옵션
4. **AWS/GCP**: 커스텀 배포

### 환경별 설정
```bash
# 프로덕션 환경 변수
NODE_ENV=production
NEXT_PUBLIC_OPENAI_API_KEY=prod_api_key
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 개발 가이드라인
- TypeScript 사용 필수
- ESLint 규칙 준수
- 컴포넌트별 에러 바운더리 구현
- 아동 안전 기능 우선 고려

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.

## 🙏 감사의 말

- **OpenAI**: Realtime API 제공
- **WebRTC**: 실시간 통신 기술
- **Next.js**: 풀스택 프레임워크
- **모든 기여자들**

## 📞 지원

문제가 발생하거나 질문이 있으시면:
- GitHub Issues 등록
- 이메일: support@dubu.com
- 문서: [프로젝트 위키](https://github.com/yourproject/wiki)

---

**Made with ❤️ for children by Dubu Team**