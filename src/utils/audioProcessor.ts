// 오디오 처리를 위한 상수들
const INPUT_TARGET_SR = 16000; // OpenAI Realtime 입력 권장 (PCM16)
const OUTPUT_SAMPLE_RATE = 24000; // OpenAI Realtime 출력(PCM16) 기본
const BUFFER_SIZE = 4096;
const CHANNELS = 1; // 모노

export class AudioProcessor {
  private audioContext: AudioContext | null = null;

  // 입력(게스트 마이크 or 원격 스트림) 처리용
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  // 출력(게스트로 보낼 AI 음성) 처리용
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private aiResponseStream: MediaStream | null = null;

  // (선택) 로컬 재생/볼륨 조절용
  private gainNode: GainNode | null = null;
  private destinationStream: MediaStream | null = null;

  // AI 응답 오디오 재생용 큐
  private playQueue: AudioBuffer[] = [];
  private isPlaying = false;

  // 오디오 컨텍스트 초기화
  async initializeAudioContext(): Promise<boolean> {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      console.log("🎛️ AudioContext ready. deviceSampleRate=", this.audioContext.sampleRate);
      return true;
    } catch (err) {
      console.error("오디오 컨텍스트 초기화 실패:", err);
      return false;
    }
  }

  /**
   * 입력 스트림을 캡처하여 16k PCM16으로 변환해 콜백으로 전달
   * - ScriptProcessorNode 사용 (간단/즉시)
   * - 다운샘플: (예) 48000 → 16000
   */
  setupInputProcessor(inputStream: MediaStream, onAudioData: (audioBuffer: ArrayBuffer) => void): boolean {
    if (!this.audioContext) {
      console.error("오디오 컨텍스트가 초기화되지 않았습니다");
      return false;
    }

    try {
      // 1) 입력 소스
      this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);

      // 2) ScriptProcessorNode (deprecated이긴 하되, AudioWorklet 없이 빠르게 확인 시 가장 간단)
      this.processorNode = this.audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);

      // 3) 처리 루프
      this.processorNode.onaudioprocess = (event) => {
        const inFloat = event.inputBuffer.getChannelData(0); // 원본 float32 (보통 48kHz)
        const inRate = event.inputBuffer.sampleRate || this.audioContext!.sampleRate;

        // (디버깅) 파형이 살아있는지 간단체크
        // const peek = Math.max(...inFloat.map(v => Math.abs(v)));
        // if (peek > 0.01) console.log("🎙️ mic peak:", peek.toFixed(4));

        // 4) 다운샘플링 → 16k float32
        const down = this.downsampleFloat32(inFloat, inRate, INPUT_TARGET_SR);

        // 5) Float32 → PCM16 (리틀엔디언) 변환
        const pcm16 = this.floatToPCM16(down);

        // 6) 콜백으로 전달 (OpenAI에 append)
        onAudioData(pcm16);
      };

      // 4) 무음 경로(그래프 활성 유지 + 피드백 방지)
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      console.log("✅ 입력 오디오 프로세서 설정 완료 (raw→downsample→PCM16)");
      return true;
    } catch (err) {
      console.error("입력 프로세서 설정 실패:", err);
      return false;
    }
  }

  /**
   * OpenAI 응답을 WebRTC로 보내기 위한 MediaStream 생성
   * - enqueueAIResponse()로 AudioBuffer를 재생시키면 이 스트림으로 흘러갑니다.
   */
  createAIResponseStream(): MediaStream | null {
    if (!this.audioContext) {
      console.error("오디오 컨텍스트가 초기화되지 않았습니다");
      return null;
    }

    try {
      this.streamDestination = this.audioContext.createMediaStreamDestination();
      this.aiResponseStream = this.streamDestination.stream;
      console.log("🎯 AI 응답 전송용 MediaStream 생성 완료");
      return this.aiResponseStream;
    } catch (err) {
      console.error("AI 응답 스트림 생성 실패:", err);
      return null;
    }
  }

  /**
   * (선택) 로컬 재생/볼륨 제어가 필요할 때 호출
   */
  createOutputProcessor(): MediaStream | null {
    if (!this.audioContext) {
      console.error("오디오 컨텍스트가 초기화되지 않았습니다");
      return null;
    }

    try {
      const destination = this.audioContext.createMediaStreamDestination();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      this.gainNode.connect(destination);

      this.destinationStream = destination.stream;
      console.log("🔊 로컬 출력용 MediaStream 생성 완료");
      return this.destinationStream;
    } catch (err) {
      console.error("출력 프로세서 생성 실패:", err);
      return null;
    }
  }

  /**
   * OpenAI에서 받은 base64(PCM16 @ 24kHz 가정) 조각을 큐에 넣고 순차 재생
   * - WebRTC로 보낼 streamDestination에 연결되어 있어야 함
   */
  async enqueueAIResponse(base64AudioData: string): Promise<void> {
    if (!this.audioContext || !this.streamDestination) {
      console.error("오디오 컨텍스트 또는 스트림 대상이 없습니다");
      return;
    }

    try {
      const raw = this.base64ToArrayBuffer(base64AudioData);
      const audioBuffer = await this.pcm16ToAudioBuffer(raw, OUTPUT_SAMPLE_RATE);

      this.playQueue.push(audioBuffer);
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (err) {
      console.error("AI 응답 큐 재생 실패:", err);
    }
  }

  private playNextInQueue() {
    if (!this.audioContext || !this.streamDestination) {
      this.isPlaying = false;
      return;
    }
    if (this.playQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const buffer = this.playQueue.shift()!;

    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = buffer;

    // 필요 시 개별 게인(전송 레벨 조정)
    const g = this.audioContext.createGain();
    g.gain.value = 1.0;

    sourceNode.connect(g);
    g.connect(this.streamDestination);

    sourceNode.start(0);
    // console.log("🔊 AI 오디오 재생:", buffer.duration.toFixed(2), "s");

    sourceNode.onended = () => {
      this.playNextInQueue();
    };
  }

  // -------- 유틸리티들 --------

  // 간단한 다운샘플러: 선형 보간 대신, 성능/안정 위해 "집계 샘플링"(nearest) + 간단 LPF 없이 사용
  // 필요 시 품질을 높이려면 FIR/linear interpolation을 적용 가능
  private downsampleFloat32(input: Float32Array, inRate: number, outRate: number): Float32Array {
    if (outRate === inRate) return input.slice();
    if (outRate > inRate) {
      // 업샘플이 필요한 경우는 없음(입력은 보통 48k이고 목표는 16k)
      return input.slice();
    }

    const ratio = inRate / outRate;
    const newLen = Math.floor(input.length / ratio);
    const result = new Float32Array(newLen);

    let idx = 0;
    let pos = 0;
    while (idx < newLen) {
      result[idx++] = input[Math.floor(pos)] || 0;
      pos += ratio;
    }
    return result;
  }

  private floatToPCM16(float32: Float32Array): ArrayBuffer {
    const out = new ArrayBuffer(float32.length * 2);
    const view = new DataView(out);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i])); // clamp
      // (선택) 입력이 너무 작다면 약간의 증폭:
      // s *= 1.5; // 필요 시 주석 해제
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return out;
  }

  private base64ToArrayBuffer(b64: string): ArrayBuffer {
    const bin = atob(b64);
    const len = bin.length;
    const buf = new ArrayBuffer(len);
    const u8 = new Uint8Array(buf);
    for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
    return buf;
  }

  // PCM16 ArrayBuffer → AudioBuffer (샘플레이트 지정)
  private async pcm16ToAudioBuffer(pcm16Data: ArrayBuffer, sampleRate: number): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error("오디오 컨텍스트가 없습니다");

    const dataView = new DataView(pcm16Data);
    const frameCount = pcm16Data.byteLength / 2;
    const audioBuffer = this.audioContext.createBuffer(CHANNELS, frameCount, sampleRate);
    const chData = audioBuffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      chData[i] = int16 / 0x8000; // -32768~32767 → -1~<1
    }
    return audioBuffer;
  }

  // (선택) 로컬 볼륨 조절
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(2, volume));
    }
  }

  // 리소스 정리
  cleanup(): void {
    try {
      if (this.processorNode) {
        this.processorNode.disconnect();
        this.processorNode.onaudioprocess = null;
        this.processorNode = null;
      }
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      if (this.streamDestination) {
        this.streamDestination.disconnect();
        this.streamDestination = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      this.destinationStream = null;
      this.aiResponseStream = null;
      this.playQueue = [];
      this.isPlaying = false;

      console.log("🧹 오디오 프로세서 리소스 정리 완료");
    } catch (e) {
      console.warn("정리 중 경고:", e);
    }
  }
}
