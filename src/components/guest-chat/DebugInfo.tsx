interface WebRTCState {
  connectionState: string;
}

interface DebugInfoProps {
  microphoneLevel?: number;
  webRTCState: WebRTCState;
}

export default function DebugInfo({ microphoneLevel, webRTCState }: DebugInfoProps) {
  return (
    <div className="text-center mt-4">
      <p className="text-xs text-blue-600">
        Guest Debug: micLevel = {microphoneLevel?.toFixed(1) || 0}
      </p>
      <p className="text-xs text-green-600">
        WebRTC: {webRTCState.connectionState} | Connected:{" "}
        {webRTCState.connectionState === "connected" ? "true" : "false"}
      </p>
    </div>
  );
}