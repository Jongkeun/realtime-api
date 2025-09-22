import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/socket";
import { setupAudioElement } from "@/utils/webRTC";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// WebRTC 설정
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "balanced",
  rtcpMuxPolicy: "require",
};

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false },
  video: false,
};

interface WebRTCGuestState {
  localStream: MediaStream | null; // 게스트 자신의 마이크 스트림
  remoteStream: MediaStream | null; // 호스트로부터 받는 AI 응답 스트림
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
}

export function useWebRTCGuest(socket: TypedSocket | null) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);
  const [webrtcState, setWebRTCState] = useState<WebRTCGuestState>({
    localStream: null,
    remoteStream: null,
    isConnected: false,
    connectionState: "new",
  });

  // 로컬 미디어 스트림 초기화 (게스트 마이크)
  const initializeLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      setWebRTCState((prev) => ({
        ...prev,
        localStream: stream,
      }));
      console.log("✅ [GUEST] 로컬 스트림 획득 성공");
      return stream;
    } catch (error) {
      console.error("❌ [GUEST] 미디어 스트림 접근 실패:", error);
      return null;
    }
  }, []);

  // Peer Connection 정리 함수
  const cleanupPeerConnection = useCallback((clearSessionId: boolean = true) => {
    if (peerConnectionRef.current) {
      console.log("🧹 [GUEST] PeerConnection 정리 중...");

      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onicegatheringstatechange = null;

      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log("✅ [GUEST] PeerConnection 정리 완료");
    }

    pendingCandidatesRef.current = [];

    if (clearSessionId) {
      currentSessionIdRef.current = null;
      console.log("🗑️ [GUEST] 세션 ID 초기화");
    }
  }, []);

  // Peer Connection 초기화 (게스트용)
  const initializePeerConnection = useCallback(
    (preserveSessionId: boolean = false) => {
      const currentSession = currentSessionIdRef.current;
      cleanupPeerConnection(false);

      if (preserveSessionId && currentSession) {
        currentSessionIdRef.current = currentSession;
        console.log("🔄 [GUEST] 기존 세션 ID 유지:", currentSessionIdRef.current);
      }

      const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionRef.current = peerConnection;

      // 연결 상태 모니터링
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        const isConnected = state === "connected";
        setWebRTCState((prev) => ({
          ...prev,
          connectionState: state,
          isConnected,
        }));
        console.log("🔗 [GUEST] WebRTC 상태:", state, "isConnected:", isConnected);
      };

      // ICE 연결 상태 모니터링
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState;
        console.log("🧊 [GUEST] ICE 연결 상태:", iceState);

        if (iceState === "connected" || iceState === "completed") {
          setWebRTCState((prev) => ({
            ...prev,
            isConnected: true,
          }));
        }
      };

      // 호스트로부터 오는 AI 응답 스트림 수신
      peerConnection.ontrack = (event) => {
        console.log("🎧 [GUEST] AI 응답 트랙 수신:", event.track);
        const remoteStream = new MediaStream([event.track]);
        setWebRTCState((prev) => ({
          ...prev,
          remoteStream,
        }));
        setupAudioElement(remoteStream, { muted: false });
      };

      // ICE candidate 처리
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit(
            "ice-candidate",
            {
              candidate: event.candidate,
              sessionId: currentSessionIdRef.current || undefined,
            },
            "", // 게스트는 호스트에게 전송
          );
          console.log("🧊 [GUEST] ICE candidate 전송");
        }
      };

      return peerConnection;
    },
    [socket, cleanupPeerConnection],
  );

  // Answer 생성 (게스트 전용)
  const createAnswer = useCallback(
    async (data: { offer: RTCSessionDescriptionInit; sessionId?: string }, fromSocketId: string) => {
      const { offer, sessionId } = data;

      // 호스트로부터 받은 세션 ID 사용
      if (sessionId) {
        currentSessionIdRef.current = sessionId;
        console.log("✅ [GUEST] 호스트 세션 ID 사용:", sessionId);
      }

      if (!socket) {
        console.warn("❌ [GUEST] Socket 없음");
        return;
      }

      console.log("🔄 [GUEST] PeerConnection 초기화");
      const peerConnection = initializePeerConnection(true);

      // 로컬 스트림 획득 및 추가
      const localStream = await initializeLocalStream();
      if (!localStream) {
        console.error("❌ [GUEST] 로컬 스트림 획득 실패");
        return;
      }

      // 게스트 마이크를 PeerConnection에 추가
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        console.log("📡 [GUEST] 마이크 트랙 추가:", track.kind);
      });

      try {
        await peerConnection.setRemoteDescription(offer);

        // ICE candidate 큐 처리
        flushPendingCandidates();

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("answer", answer, fromSocketId);
        console.log("✅ [GUEST] Answer 생성 및 전송 완료");

        await flushPendingCandidates();
      } catch (error) {
        console.error("❌ [GUEST] Answer 생성 실패:", error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socket, initializePeerConnection, initializeLocalStream],
  );

  // 큐에 저장된 ICE candidate들을 처리
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;

    if (!pc || !pc.remoteDescription || pendingCandidatesRef.current.length === 0) {
      return;
    }

    console.log(`📦 [GUEST] 큐에 저장된 ${pendingCandidatesRef.current.length}개의 ICE candidate 처리`);

    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn("⚠️ [GUEST] ICE candidate 추가 실패:", error);
      }
    }

    pendingCandidatesRef.current.length = 0;
    console.log("✅ [GUEST] ICE candidate 큐 처리 완료");
  }, []);

  // ICE Candidate 처리
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate, sessionId?: string) => {
    const pc = peerConnectionRef.current;

    if (sessionId && currentSessionIdRef.current && sessionId !== currentSessionIdRef.current) {
      console.warn("⚠️ [GUEST] 세션 ID 불일치로 ICE candidate 무시");
      return;
    }

    if (!pc || !pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(candidate);
      console.log("✅ [GUEST] ICE candidate 추가 완료");
    } catch (error) {
      console.warn("⚠️ [GUEST] ICE candidate 추가 실패:", error);
    }
  }, []);

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!socket) return;

    console.log("🔌 [GUEST] Socket 이벤트 리스너 등록");

    socket.on("offer", createAnswer);
    socket.on("ice-candidate", (data: { candidate: RTCIceCandidate; sessionId?: string }) => {
      handleIceCandidate(data.candidate, data.sessionId);
    });

    return () => {
      socket.off("offer");
      socket.off("ice-candidate");
    };
  }, [socket, createAnswer, handleIceCandidate]);

  // 컴포넌트 정리
  useEffect(() => {
    return () => {
      console.log("🧹 [GUEST] useWebRTCGuest 정리");

      // 로컬 스트림 정리
      if (webrtcState.localStream) {
        webrtcState.localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      cleanupPeerConnection();
    };
  }, []);

  return {
    ...webrtcState,
    initializeLocalStream,
    cleanup: cleanupPeerConnection,
  };
}
