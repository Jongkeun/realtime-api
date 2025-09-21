export function setupAudioElement(stream: MediaStream, options: { muted: boolean }) {
  const audioEl = document.createElement("audio");
  audioEl.srcObject = stream;
  audioEl.autoplay = true;
  audioEl.controls = false;
  audioEl.muted = options.muted;
  document.body.appendChild(audioEl);
}
