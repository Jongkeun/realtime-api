import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/socket";
import { setupAudioElement } from "@/utils/webRTC";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// WebRTC 설정 - 안정적한 STUN 서버 설정
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "balanced",
  rtcpMuxPolicy: "require",
};

interface WebRTCHostState {
  remoteStream: MediaStream | null; // 게스트로부터 받는 음성 스트림
  outgoingStream: MediaStream | null; // AI 응답을 게스트로 보내는 스트림
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
}

export function useWebRTCHost(socket: TypedSocket | null, remoteSocketId: string | null) {
  const aiSenderRef = useRef<RTCRtpSender | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);
  const remoteStreamProcessedRef = useRef<boolean>(false);
  const [webrtcState, setWebRTCState] = useState<WebRTCHostState>({
    remoteStream: null,
    outgoingStream: null,
    isConnected: false,
    connectionState: "new",
  });

  // Peer Connection 정리 함수
  const cleanupPeerConnection = useCallback((clearSessionId: boolean = true) => {
    if (peerConnectionRef.current) {
      console.log("🧹 [HOST] PeerConnection 정리 중...");

      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onicegatheringstatechange = null;

      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log("✅ [HOST] PeerConnection 정리 완료");
    }

    pendingCandidatesRef.current = [];

    if (clearSessionId) {
      currentSessionIdRef.current = null;
      console.log("🗑️ [HOST] 세션 ID 초기화");
    }
  }, []);

  // Peer Connection 초기화 (호스트용)
  const initializePeerConnection = useCallback(
    (preserveSessionId: boolean = false) => {
      const currentSession = currentSessionIdRef.current;
      cleanupPeerConnection(false);

      // 🆕 WebRTC 상태 초기화
      setWebRTCState((prev) => ({
        ...prev,
        remoteStream: null,
        outgoingStream: null,
        isConnected: false,
        connectionState: "new",
      }));

      if (!preserveSessionId || !currentSession) {
        currentSessionIdRef.current = Math.random().toString(36).substring(2, 15);
        console.log("🆕 [HOST] 새로운 세션 ID 생성:", currentSessionIdRef.current);
      } else {
        currentSessionIdRef.current = currentSession;
        console.log("🔄 [HOST] 기존 세션 ID 유지:", currentSessionIdRef.current);
      }

      const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionRef.current = peerConnection;

      // 호스트: AI 오디오 송수신용 transceiver 예약
      const tx = peerConnection.addTransceiver("audio", { direction: "sendrecv" });
      aiSenderRef.current = tx.sender;
      console.log("🎛️ [HOST] AI 오디오 송수신용 transceiver 예약 완료");

      // 연결 상태 모니터링
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        const isConnected = state === "connected";
        setWebRTCState((prev) => ({
          ...prev,
          connectionState: state,
          isConnected,
        }));
        console.log("🔗 [HOST] WebRTC 상태:", state, "isConnected:", isConnected);
      };

      // ICE 연결 상태 모니터링
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState;
        console.log("🧊 [HOST] ICE 연결 상태:", iceState);

        if (iceState === "connected" || iceState === "completed") {
          setWebRTCState((prev) => ({
            ...prev,
            isConnected: true,
          }));
        }
      };

      // 게스트로부터 오는 음성 스트림 수신 (최초 한 번만)
      peerConnection.ontrack = (event) => {
        console.log("🎧 [HOST] 게스트 음성 트랙 수신:", event.track);

        setWebRTCState((prev) => {
          // 이미 remoteStream이 있다면 스킵 (중복 호출 방지)
          if (prev.remoteStream) {
            return prev;
          }
          const remoteStream = new MediaStream([event.track]);
          setupAudioElement(remoteStream, { muted: true });

          return {
            ...prev,
            remoteStream,
          };
        });
      };

      // ICE candidate 처리
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket && remoteSocketId) {
          socket.emit(
            "ice-candidate",
            {
              candidate: event.candidate,
              sessionId: currentSessionIdRef.current || undefined,
            },
            remoteSocketId,
          );
          console.log("🧊 [HOST] ICE candidate 전송");
        }
      };

      return peerConnection;
    },
    [socket, remoteSocketId, cleanupPeerConnection],
  );

  // Offer 생성 (호스트 전용)
  const createOffer = useCallback(async () => {
    console.log("🎯 [HOST] createOffer 시작");

    if (!socket || !remoteSocketId) {
      console.warn("❌ [HOST] Offer 생성 불가 - socket 또는 remoteSocketId 없음");
      return;
    }

    try {
      const peerConnection = initializePeerConnection(false);

      // 호스트: 게스트 음성 수신용 설정
      peerConnection.addTransceiver("audio", { direction: "recvonly" });

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await peerConnection.setLocalDescription(offer);
      socket.emit("offer", { offer, sessionId: currentSessionIdRef.current || undefined }, remoteSocketId);
      console.log("✅ [HOST] Offer 전송 완료");
    } catch (error) {
      console.error("❌ [HOST] Offer 생성 실패:", error);
    }
  }, [socket, remoteSocketId, initializePeerConnection]);

  // Answer 처리 (호스트용)
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) {
      console.warn("❌ [HOST] Answer 처리 불가 - PeerConnection 없음");
      return;
    }

    try {
      await peerConnectionRef.current.setRemoteDescription(answer);
      console.log("✅ [HOST] Answer 처리 완료");
      await flushPendingCandidates();
    } catch (error) {
      console.error("❌ [HOST] Answer 처리 실패:", error);
    }
  }, []);

  // 큐에 저장된 ICE candidate들을 처리
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;

    if (!pc || !pc.remoteDescription || pendingCandidatesRef.current.length === 0) {
      return;
    }

    console.log(`📦 [HOST] 큐에 저장된 ${pendingCandidatesRef.current.length}개의 ICE candidate 처리`);

    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn("⚠️ [HOST] ICE candidate 추가 실패:", error);
      }
    }

    pendingCandidatesRef.current.length = 0;
    console.log("✅ [HOST] ICE candidate 큐 처리 완료");
  }, []);

  // ICE Candidate 처리
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate, sessionId?: string) => {
    const pc = peerConnectionRef.current;

    if (sessionId && currentSessionIdRef.current && sessionId !== currentSessionIdRef.current) {
      console.warn("⚠️ [HOST] 세션 ID 불일치로 ICE candidate 무시");
      return;
    }

    if (!pc || !pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(candidate);
      console.log("✅ [HOST] ICE candidate 추가 완료");
    } catch (error) {
      console.warn("⚠️ [HOST] ICE candidate 추가 실패:", error);
    }
  }, []);

  // AI 응답 스트림을 게스트에게 전송
  const setOutgoingStream = useCallback(async (stream: MediaStream | null) => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection || !aiSenderRef.current) {
      console.warn("❌ [HOST] 송신 스트림 설정 불가");
      return;
    }

    try {
      const track = stream?.getAudioTracks()[0] || null;
      await aiSenderRef.current.replaceTrack(track);

      setWebRTCState((prev) => ({
        ...prev,
        outgoingStream: stream,
      }));

      console.log("✅ [HOST] AI 응답 스트림 설정 완료");
    } catch (error) {
      console.error("❌ [HOST] 송신 스트림 설정 실패:", error);
    }
  }, []);

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!socket) return;

    console.log("🔌 [HOST] Socket 이벤트 리스너 등록");

    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", (data: { candidate: RTCIceCandidate; sessionId?: string }) => {
      handleIceCandidate(data.candidate, data.sessionId);
    });

    return () => {
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket, handleAnswer, handleIceCandidate]);

  // 컴포넌트 정리
  useEffect(() => {
    return () => {
      console.log("🧹 [HOST] useWebRTCHost 정리");
      cleanupPeerConnection();
    };
  }, []);

  return {
    ...webrtcState,
    createOffer,
    setOutgoingStream,
    cleanup: cleanupPeerConnection,
  };
}
