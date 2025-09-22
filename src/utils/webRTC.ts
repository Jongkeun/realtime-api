// audio element 클래스로 관리
class AudioElementManager {
  private audioElement: HTMLAudioElement | null = null;

  setup(stream: MediaStream, options: { muted: boolean }) {
    // 이미 audio element가 있다면 stream만 갈아끼우기
    if (this.audioElement) {
      console.log("🔄 기존 audio element에 새 stream 적용");
      this.audioElement.srcObject = stream;
      this.audioElement.muted = options.muted;
      return this.audioElement;
    }

    // 처음 생성하는 경우
    console.log("🆕 새로운 audio element 생성");
    this.audioElement = document.createElement("audio");
    this.audioElement.srcObject = stream;
    this.audioElement.autoplay = true;
    this.audioElement.controls = false;
    this.audioElement.muted = options.muted;
    document.body.appendChild(this.audioElement);

    return this.audioElement;
  }

  cleanup() {
    if (this.audioElement) {
      console.log("🗑️ audio element 정리");
      this.audioElement.remove();
      this.audioElement = null;
    }
  }

  getElement() {
    return this.audioElement;
  }
}

// 싱글톤 인스턴스
const audioManager = new AudioElementManager();

export function setupAudioElement(stream: MediaStream, options: { muted: boolean }) {
  return audioManager.setup(stream, options);
}

export function cleanupAudioElement() {
  audioManager.cleanup();
}
