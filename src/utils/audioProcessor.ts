// 오디오 처리를 위한 상수들
const SAMPLE_RATE = 16000; // OpenAI Realtime API 권장 샘플레이트
const BUFFER_SIZE = 4096;
const CHANNELS = 1; // 모노 채널

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private destinationStream: MediaStream | null = null;
  private gainNode: GainNode | null = null;

  // AI 응답 스트림을 위한 추가 노드들
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private aiResponseStream: MediaStream | null = null;

  // 오디오 컨텍스트 초기화
  async initializeAudioContext(): Promise<boolean> {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      console.log("오디오 컨텍스트 초기화됨, 샘플레이트:", this.audioContext.sampleRate);
      return true;
    } catch (error) {
      console.error("오디오 컨텍스트 초기화 실패:", error);
      return false;
    }
  }

  // 입력 스트림을 OpenAI 포맷으로 처리
  setupInputProcessor(inputStream: MediaStream, onAudioData: (audioBuffer: ArrayBuffer) => void): boolean {
    if (!this.audioContext) {
      console.error("오디오 컨텍스트가 초기화되지 않았습니다");
      return false;
    }

    console.log("🎵 AudioProcessor - 입력 스트림 분석:", {
      streamId: inputStream.id,
      audioTracks: inputStream.getAudioTracks().length,
      audioTrackDetails: inputStream.getAudioTracks().map((track) => ({
        id: track.id,
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label,
      })),
      allTracks: inputStream.getTracks().length,
    });

    try {
      // 입력 소스 노드 생성
      this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);
      console.log("✅ MediaStreamSource 노드 생성 완료");

      // 프로세서 노드 생성 (deprecated API 대신 AnalyserNode 사용)
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = BUFFER_SIZE * 2;
      this.analyserNode.smoothingTimeConstant = 0;

      // 오디오 데이터 처리
      const processAudio = () => {
        const bufferLength = this.analyserNode!.frequencyBinCount;
        const audioData = new Float32Array(bufferLength);
        this.analyserNode!.getFloatTimeDomainData(audioData);

        // 디버깅용 분석
        let maxAmplitude = 0;
        for (let i = 0; i < audioData.length; i++) {
          const sample = Math.abs(audioData[i]);
          maxAmplitude = Math.max(maxAmplitude, sample);
        }

        // if (maxAmplitude > 0.01) {
        //   console.log("🎵 게스트 오디오 감지됨:", maxAmplitude.toFixed(4));
        // }

        // Float32Array → PCM16 변환
        const pcm16Buffer = this.convertToPCM16(audioData);
        onAudioData(pcm16Buffer);

        // 다음 프레임 처리
        requestAnimationFrame(processAudio);
      };

      // 노드 연결 (무음 경로)
      this.sourceNode.connect(this.analyserNode);

      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0; // 소리 안 나게 음소거

      this.analyserNode.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      // 오디오 처리 시작
      processAudio();

      console.log("입력 오디오 프로세서 설정 완료 (무음 destination 연결)");
      return true;
    } catch (error) {
      console.error("입력 프로세서 설정 실패:", error);
      return false;
    }
  }

  // OpenAI에서 받은 오디오를 재생 가능한 스트림으로 변환
  createOutputProcessor(): MediaStream | null {
    if (!this.audioContext) {
      console.error("오디오 컨텍스트가 초기화되지 않았습니다");
      return null;
    }

    try {
      // MediaStreamDestination 생성
      const destination = this.audioContext.createMediaStreamDestination();

      // 볼륨 조절을 위한 게인 노드
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0; // 기본 볼륨

      // 연결
      this.gainNode.connect(destination);

      this.destinationStream = destination.stream;
      console.log("출력 오디오 프로세서 생성 완료");
      return this.destinationStream;
    } catch (error) {
      console.error("출력 프로세서 생성 실패:", error);
      return null;
    }
  }

  // AI 응답용 실시간 MediaStream 생성 (WebRTC 전송용)
  createAIResponseStream(): MediaStream | null {
    if (!this.audioContext) {
      console.error("오디오 컨텍스트가 초기화되지 않았습니다");
      return null;
    }

    try {
      // AI 응답 전용 MediaStreamDestination 생성
      this.streamDestination = this.audioContext.createMediaStreamDestination();

      // AI 응답용 게인 노드 (별도 볼륨 조절)
      const aiGainNode = this.audioContext.createGain();
      aiGainNode.gain.value = 1.0;

      // 연결: aiGainNode → streamDestination
      aiGainNode.connect(this.streamDestination);

      this.aiResponseStream = this.streamDestination.stream;

      console.log("AI 응답용 MediaStream 생성 완료");
      return this.aiResponseStream;
    } catch (error) {
      console.error("AI 응답 스트림 생성 실패:", error);
      return null;
    }
  }

  // OpenAI에서 받은 base64 오디오 데이터를 재생
  async playAudioData(base64AudioData: string): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      console.error("오디오 컨텍스트 또는 게인 노드가 없습니다");
      return;
    }

    try {
      // base64를 ArrayBuffer로 디코딩
      const binaryString = atob(base64AudioData);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      // PCM16 데이터를 AudioBuffer로 변환
      const audioBuffer = await this.pcm16ToAudioBuffer(arrayBuffer);

      // AudioBufferSourceNode로 재생
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.gainNode);
      sourceNode.start(0);

      console.log("오디오 재생 시작, 길이:", audioBuffer.duration, "초");
    } catch (error) {
      console.error("오디오 재생 실패:", error);
    }
  }

  // AI 응답 오디오를 실시간 스트림으로 재생 (WebRTC 전송용)
  async playAudioToStream(base64AudioData: string): Promise<void> {
    if (!this.audioContext || !this.streamDestination) {
      console.error("오디오 컨텍스트 또는 스트림 대상이 없습니다");
      return;
    }

    try {
      // base64를 ArrayBuffer로 디코딩
      const binaryString = atob(base64AudioData);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      // PCM16 데이터를 AudioBuffer로 변환
      const audioBuffer = await this.pcm16ToAudioBuffer(arrayBuffer);

      // AudioBufferSourceNode로 스트림에 재생
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;

      // 스트림으로 출력하기 위한 게인 노드 생성
      const streamGainNode = this.audioContext.createGain();
      streamGainNode.gain.value = 1.0;

      // 연결: sourceNode → streamGainNode → streamDestination
      sourceNode.connect(streamGainNode);
      streamGainNode.connect(this.streamDestination);

      sourceNode.start(0);

      console.log("AI 응답 오디오를 스트림으로 재생, 길이:", audioBuffer.duration, "초");
    } catch (error) {
      console.error("스트림 오디오 재생 실패:", error);
    }
  }

  // Float32Array를 PCM16으로 변환
  private convertToPCM16(float32Array: Float32Array): ArrayBuffer {
    const pcm16Buffer = new ArrayBuffer(float32Array.length * 2); // 16bit = 2bytes
    const view = new DataView(pcm16Buffer);

    for (let i = 0; i < float32Array.length; i++) {
      // Float32 (-1.0 ~ 1.0)를 Int16 (-32768 ~ 32767)로 변환
      let sample = Math.max(-1, Math.min(1, float32Array[i]));
      sample = sample * 0x7fff; // 32767
      view.setInt16(i * 2, sample, true); // little-endian
    }

    return pcm16Buffer;
  }

  // PCM16 ArrayBuffer를 AudioBuffer로 변환
  private async pcm16ToAudioBuffer(pcm16Data: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error("오디오 컨텍스트가 없습니다");
    }

    const dataView = new DataView(pcm16Data);
    const frameCount = pcm16Data.byteLength / 2; // 16bit = 2bytes per sample

    // AudioBuffer 생성
    const audioBuffer = this.audioContext.createBuffer(CHANNELS, frameCount, SAMPLE_RATE);
    const channelData = audioBuffer.getChannelData(0);

    // PCM16을 Float32로 변환
    for (let i = 0; i < frameCount; i++) {
      const int16Sample = dataView.getInt16(i * 2, true); // little-endian
      channelData[i] = int16Sample / 0x7fff; // normalize to -1.0 ~ 1.0
    }

    return audioBuffer;
  }

  // 볼륨 조절
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(2, volume)); // 0 ~ 2.0 범위
    }
  }

  // 리소스 정리
  cleanup(): void {
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
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
    console.log("오디오 프로세서 리소스 정리 완료");
  }
}
