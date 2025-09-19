// 오디오 처리를 위한 상수들
const SAMPLE_RATE = 16000 // OpenAI Realtime API 권장 샘플레이트
const BUFFER_SIZE = 4096
const CHANNELS = 1 // 모노 채널

export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private destinationStream: MediaStream | null = null
  private gainNode: GainNode | null = null

  // 오디오 컨텍스트 초기화
  async initializeAudioContext(): Promise<boolean> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      })
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      
      console.log('오디오 컨텍스트 초기화됨, 샘플레이트:', this.audioContext.sampleRate)
      return true
    } catch (error) {
      console.error('오디오 컨텍스트 초기화 실패:', error)
      return false
    }
  }

  // 입력 스트림을 OpenAI 포맷으로 처리
  setupInputProcessor(
    inputStream: MediaStream,
    onAudioData: (audioBuffer: ArrayBuffer) => void
  ): boolean {
    if (!this.audioContext) {
      console.error('오디오 컨텍스트가 초기화되지 않았습니다')
      return false
    }

    try {
      // 입력 소스 노드 생성
      this.sourceNode = this.audioContext.createMediaStreamSource(inputStream)
      
      // 프로세서 노드 생성 (구형 API 사용, 새 버전에서는 AudioWorklet 권장)
      this.processorNode = this.audioContext.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS)
      
      // 오디오 데이터 처리
      this.processorNode.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer
        const audioData = inputBuffer.getChannelData(0) // 첫 번째 채널만 사용
        
        // Float32Array를 PCM16으로 변환
        const pcm16Buffer = this.convertToPCM16(audioData)
        onAudioData(pcm16Buffer)
      }

      // 노드들 연결
      this.sourceNode.connect(this.processorNode)
      this.processorNode.connect(this.audioContext.destination)
      
      console.log('입력 오디오 프로세서 설정 완료')
      return true
    } catch (error) {
      console.error('입력 프로세서 설정 실패:', error)
      return false
    }
  }

  // OpenAI에서 받은 오디오를 재생 가능한 스트림으로 변환
  createOutputProcessor(): MediaStream | null {
    if (!this.audioContext) {
      console.error('오디오 컨텍스트가 초기화되지 않았습니다')
      return null
    }

    try {
      // MediaStreamDestination 생성
      const destination = this.audioContext.createMediaStreamDestination()
      
      // 볼륨 조절을 위한 게인 노드
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 1.0 // 기본 볼륨
      
      // 연결
      this.gainNode.connect(destination)
      
      this.destinationStream = destination.stream
      console.log('출력 오디오 프로세서 생성 완료')
      return this.destinationStream
    } catch (error) {
      console.error('출력 프로세서 생성 실패:', error)
      return null
    }
  }

  // OpenAI에서 받은 base64 오디오 데이터를 재생
  async playAudioData(base64AudioData: string): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      console.error('오디오 컨텍스트 또는 게인 노드가 없습니다')
      return
    }

    try {
      // base64를 ArrayBuffer로 디코딩
      const binaryString = atob(base64AudioData)
      const arrayBuffer = new ArrayBuffer(binaryString.length)
      const uint8Array = new Uint8Array(arrayBuffer)
      
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i)
      }

      // PCM16 데이터를 AudioBuffer로 변환
      const audioBuffer = await this.pcm16ToAudioBuffer(arrayBuffer)
      
      // AudioBufferSourceNode로 재생
      const sourceNode = this.audioContext.createBufferSource()
      sourceNode.buffer = audioBuffer
      sourceNode.connect(this.gainNode)
      sourceNode.start(0)
      
      console.log('오디오 재생 시작, 길이:', audioBuffer.duration, '초')
    } catch (error) {
      console.error('오디오 재생 실패:', error)
    }
  }

  // Float32Array를 PCM16으로 변환
  private convertToPCM16(float32Array: Float32Array): ArrayBuffer {
    const pcm16Buffer = new ArrayBuffer(float32Array.length * 2) // 16bit = 2bytes
    const view = new DataView(pcm16Buffer)
    
    for (let i = 0; i < float32Array.length; i++) {
      // Float32 (-1.0 ~ 1.0)를 Int16 (-32768 ~ 32767)로 변환
      let sample = Math.max(-1, Math.min(1, float32Array[i]))
      sample = sample * 0x7FFF // 32767
      view.setInt16(i * 2, sample, true) // little-endian
    }
    
    return pcm16Buffer
  }

  // PCM16 ArrayBuffer를 AudioBuffer로 변환
  private async pcm16ToAudioBuffer(pcm16Data: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('오디오 컨텍스트가 없습니다')
    }

    const dataView = new DataView(pcm16Data)
    const frameCount = pcm16Data.byteLength / 2 // 16bit = 2bytes per sample
    
    // AudioBuffer 생성
    const audioBuffer = this.audioContext.createBuffer(CHANNELS, frameCount, SAMPLE_RATE)
    const channelData = audioBuffer.getChannelData(0)
    
    // PCM16을 Float32로 변환
    for (let i = 0; i < frameCount; i++) {
      const int16Sample = dataView.getInt16(i * 2, true) // little-endian
      channelData[i] = int16Sample / 0x7FFF // normalize to -1.0 ~ 1.0
    }
    
    return audioBuffer
  }

  // 볼륨 조절
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(2, volume)) // 0 ~ 2.0 범위
    }
  }

  // 리소스 정리
  cleanup(): void {
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.destinationStream = null
    console.log('오디오 프로세서 리소스 정리 완료')
  }
}