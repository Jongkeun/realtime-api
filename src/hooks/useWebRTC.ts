import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents, UserRole } from "@/types/socket";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// WebRTC 설정 - 안정적인 STUN 서버 설정
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  iceCandidatePoolSize: 10, // ICE candidate pool 설정
  iceTransportPolicy: "all",
  bundlePolicy: "balanced",
  rtcpMuxPolicy: "require",
};

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: true, // 최소한의 오디오 설정
  video: false,
};

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  outgoingStream: MediaStream | null; // 호스트가 게스트로 전송하는 스트림 (AI 응답)
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
}

export function useWebRTC(socket: TypedSocket | null, role: UserRole | null, remoteSocketId: string | null) {
  const aiSenderRef = useRef<RTCRtpSender | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);
  const [webrtcState, setWebRTCState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    outgoingStream: null,
    isConnected: false,
    connectionState: "new",
  });

  // 로컬 미디어 스트림 초기화
  const initializeLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      setWebRTCState((prev) => ({
        ...prev,
        localStream: stream,
      }));
      console.log("✅ 로컬 스트림 획득 성공");
      return stream;
    } catch (error) {
      console.error("❌ 미디어 스트림 접근 실패:", error);
      return null;
    }
  }, []);

  // Peer Connection 정리 함수
  const cleanupPeerConnection = useCallback((clearSessionId: boolean = true) => {
    if (peerConnectionRef.current) {
      console.log("🧹 PeerConnection 정리 중...");

      // 이벤트 리스너 제거
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onicegatheringstatechange = null;

      // PeerConnection 닫기
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;

      console.log("✅ PeerConnection 정리 완료");
    }

    // 큐 초기화
    pendingCandidatesRef.current = [];

    // 세션 ID 초기화 (선택적)
    if (clearSessionId) {
      currentSessionIdRef.current = null;
      console.log("🗑️ 세션 ID 초기화");
    }
  }, []);

  // Peer Connection 초기화
  const initializePeerConnection = useCallback(
    (preserveSessionId: boolean = false, role: "host" | "guest") => {
      // 기존 연결 정리 (세션 ID는 보존 가능)
      const currentSession = currentSessionIdRef.current;
      cleanupPeerConnection(false); // 세션 ID는 초기화하지 않음

      // 세션 ID 설정 (보존하거나 새로 생성)
      if (!preserveSessionId || !currentSession) {
        currentSessionIdRef.current = Math.random().toString(36).substring(2, 15);
        console.log("🆕 새로운 세션 ID 생성:", currentSessionIdRef.current);
      } else {
        currentSessionIdRef.current = currentSession;
        console.log("🔄 기존 세션 ID 유지:", currentSessionIdRef.current);
      }
      console.log("🆕 새로운 PeerConnection 생성 중... (세션 ID:", currentSessionIdRef.current, ")");

      const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionRef.current = peerConnection;
      console.log("!! initializePeerConnection");

      if (role === "host") {
        const tx = peerConnection.addTransceiver("audio", { direction: "sendrecv" });
        aiSenderRef.current = tx.sender;
        console.log("!! 🎛️ 호스트: AI 오디오 송수신용 transceiver 예약 완료");
      }

      // 연결 상태 모니터링
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        const isConnected = state === "connected";
        setWebRTCState((prev) => {
          console.log("🔄 WebRTC connectionState 변경:", {
            이전: prev.connectionState,
            현재: state,
            isConnected,
          });
          return {
            ...prev,
            connectionState: state,
            isConnected,
          };
        });
        console.log("🔗 WebRTC 상태:", state, "isConnected:", isConnected);

        if (state === "failed") {
          console.error("❌ WebRTC 연결 실패");
        } else if (isConnected) {
          console.log("✅ WebRTC 연결 성공!");
        }
      };

      // ICE 연결 상태 모니터링
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection.iceConnectionState;
        console.log("🧊 ICE 연결 상태:", iceState);

        if (iceState === "connected" || iceState === "completed") {
          console.log("✅ ICE 연결 성공!");
          // ICE 연결이 성공하면 WebRTC도 연결된 것으로 간주
          setWebRTCState((prev) => {
            console.log("🔄 WebRTC 상태 업데이트: isConnected = true");
            return {
              ...prev,
              isConnected: true,
            };
          });
        } else if (iceState === "failed") {
          console.error("❌ ICE 연결 실패");
        } else if (iceState === "disconnected") {
          console.warn("⚠️ ICE 연결 끊어짐");
        }
      };

      // 원격 스트림 수신
      peerConnection.ontrack = (event) => {
        console.log("!! 🎧 원격 트랙 수신됨:", event.track);

        // event.streams[0] 대신, 새 MediaStream을 직접 구성
        const remoteStream = new MediaStream([event.track]);

        setWebRTCState((prev) => ({
          ...prev,
          remoteStream,
        }));

        // 확인용 재생
        const audioEl = document.createElement("audio");
        audioEl.srcObject = remoteStream;
        audioEl.autoplay = true;
        audioEl.controls = false;
        audioEl.muted = role === "guest" ? false : true;
        document.body.appendChild(audioEl);

        event.track.onmute = () => {
          console.warn("!! 🎧 원격 트랙 mute됨:", event.track.id);
        };
        event.track.onunmute = () => {
          console.log("!! 🎧 원격 트랙 unmute됨:", event.track.id);
        };
      };

      // ICE candidate 처리
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket && remoteSocketId) {
          // 세션 ID와 함께 ICE candidate 전송
          socket.emit(
            "ice-candidate",
            {
              candidate: event.candidate,
              sessionId: currentSessionIdRef.current || undefined,
            },
            remoteSocketId,
          );
          console.log("🧊 ICE candidate 전송", {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sessionId: currentSessionIdRef.current,
          });
        } else {
          console.log("🧊 ICE gathering 완료");
        }
      };

      // ICE gathering 상태 모니터링
      peerConnection.onicegatheringstatechange = () => {
        console.log("🧊 ICE gathering 상태:", peerConnection.iceGatheringState);
      };

      console.log("✅ PeerConnection 생성 완료");
      return peerConnection;
    },
    [socket, remoteSocketId, cleanupPeerConnection],
  );

  // Offer 생성 (Host용) - 마이크 없이 생성
  const createOffer = useCallback(async () => {
    console.log("🎯 createOffer 시작", {
      socket: !!socket,
      remoteSocketId,
      role,
      socketConnected: socket?.connected,
    });

    if (!socket || !remoteSocketId || role !== "host") {
      console.warn("❌ Offer 생성 불가 - 조건 미충족", {
        socket: !!socket,
        remoteSocketId,
        role,
      });
      return;
    }

    if (!socket.connected) {
      console.warn("❌ Socket이 연결되지 않음");
      return;
    }

    try {
      const peerConnection = initializePeerConnection(false, "host");

      // 호스트는 마이크 없이 Offer 생성 (게스트의 음성만 수신)
      console.log("🎵 호스트는 마이크 없이 Offer 생성 (게스트 음성 수신용)");
      peerConnection.addTransceiver("audio", { direction: "recvonly" });
      // PeerConnection 상태 확인
      console.log("PeerConnection 초기 상태:", {
        connectionState: peerConnection.connectionState,
        iceGatheringState: peerConnection.iceGatheringState,
        iceConnectionState: peerConnection.iceConnectionState,
        signalingState: peerConnection.signalingState,
      });

      // **호스트용**: 게스트의 음성만 수신하는 Offer 생성
      console.log("📝 Offer 생성 중... (게스트 음성 수신용)");
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true, // 게스트의 음성 수신
        offerToReceiveVideo: false,
      });

      console.log("Offer 생성 완료:", offer.type);

      console.log("⚙️ setLocalDescription 시작...1");
      console.log("Offer 내용:", offer);
      console.log("PeerConnection 상태:", {
        connectionState: peerConnection.connectionState,
        iceGatheringState: peerConnection.iceGatheringState,
        iceConnectionState: peerConnection.iceConnectionState,
        signalingState: peerConnection.signalingState,
      });

      // setLocalDescription 실행
      try {
        console.log("⏳ setLocalDescription 시작...");
        console.log("setLocalDescription 호출 중...");

        await peerConnection.setLocalDescription(offer);
        console.log("✅ peerConnection.setLocalDescription 성공");

        // ICE gathering 상태 확인
        console.log("🧊 ICE gathering 상태:", peerConnection.iceGatheringState);

        // 성공 후 상태 확인
        console.log("성공 후 상태:", {
          connectionState: peerConnection.connectionState,
          iceGatheringState: peerConnection.iceGatheringState,
          iceConnectionState: peerConnection.iceConnectionState,
          signalingState: peerConnection.signalingState,
        });
      } catch (error) {
        console.error("❌ setLocalDescription 실패:", error);
        throw error;
      }

      console.log("📤 Offer 전송 중...");
      socket.emit("offer", { offer, sessionId: currentSessionIdRef.current || undefined }, remoteSocketId);
      console.log("✅ Offer 전송 완료");
    } catch (error) {
      console.error("❌ Offer 생성 실패:", error);
    }
  }, [socket, remoteSocketId, role, initializePeerConnection]);

  // 큐에 저장된 ICE candidate들을 처리
  const flushPendingCandidates = useCallback(async () => {
    console.log("🔄 ===== ICE Candidate 큐 처리 시작 =====");

    const pc = peerConnectionRef.current;
    console.log("📊 PeerConnection 상태:", {
      exists: !!pc,
      remoteDescription: !!pc?.remoteDescription,
      connectionState: pc?.connectionState,
      iceConnectionState: pc?.iceConnectionState,
      signalingState: pc?.signalingState,
    });

    if (!pc || !pc.remoteDescription || pendingCandidatesRef.current.length === 0) {
      console.log("⚠️ 큐 처리 건너뜀:", {
        noPeerConnection: !pc,
        noRemoteDescription: !pc?.remoteDescription,
        emptyQueue: pendingCandidatesRef.current.length === 0,
        closed: !pc,
      });
      return;
    }

    console.log(`📦 큐에 저장된 ${pendingCandidatesRef.current.length}개의 ICE candidate를 처리합니다`);
    console.log(
      "📋 큐 내용:",
      pendingCandidatesRef.current.map((c) => ({
        candidate: c.candidate?.substring(0, 50) + "...",
        sdpMLineIndex: c.sdpMLineIndex,
        sdpMid: c.sdpMid,
      })),
    );

    for (let i = 0; i < pendingCandidatesRef.current.length; i++) {
      const candidate = pendingCandidatesRef.current[i];
      try {
        console.log(`🔄 [${i + 1}/${pendingCandidatesRef.current.length}] ICE candidate 처리 중:`, {
          candidate: candidate.candidate?.substring(0, 50) + "...",
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid,
        });

        // PeerConnection이 없으면 즉시 중단
        if (!pc) {
          console.warn("❌ PeerConnection이 없으므로 ICE candidate 처리 중단");
          break;
        }

        // addIceCandidate 호출 (타임아웃 없이)
        console.log("⏱️ addIceCandidate 호출 중...");
        try {
          await pc.addIceCandidate(candidate);
          console.log(`✅ [${i + 1}/${pendingCandidatesRef.current.length}] ICE candidate 추가 완료`);
        } catch (error) {
          console.warn(
            `⚠️ [${i + 1}/${pendingCandidatesRef.current.length}] ICE candidate 추가 실패하지만 계속 진행:`,
            error,
          );
          // 실패해도 계속 진행
        }
      } catch (error) {
        console.warn(
          `⚠️ [${i + 1}/${pendingCandidatesRef.current.length}] ICE candidate 추가 실패하지만 계속 진행:`,
          error,
        );
        // 실패해도 계속 진행
      }
    }

    // 큐 비우기
    const processedCount = pendingCandidatesRef.current.length;
    pendingCandidatesRef.current.length = 0;
    console.log(`✅ 큐에 저장된 ${processedCount}개의 ICE candidate 처리 완료`);
    console.log("🔄 ===== ICE Candidate 큐 처리 완료 =====");
  }, []);

  // Answer 생성 (Guest용)
  const createAnswer = useCallback(
    async (data: { offer: RTCSessionDescriptionInit; sessionId?: string }, fromSocketId: string) => {
      const { offer, sessionId } = data;
      console.log("🎯 ===== Answer 생성 시작 =====");
      console.log("📋 초기 상태:", {
        socket: !!socket,
        role,
        fromSocketId,
        offerType: offer.type,
        socketConnected: socket?.connected,
        receivedSessionId: sessionId,
        offerSdp: offer.sdp?.substring(0, 100) + "...",
      });

      // 호스트로부터 받은 세션 ID 사용
      if (sessionId) {
        currentSessionIdRef.current = sessionId;
        console.log("✅ 호스트 세션 ID 사용:", sessionId);
      }

      if (!socket || role !== "guest") {
        console.warn("❌ Answer 생성 불가:", { socket: !!socket, role });
        return;
      }

      if (!socket.connected) {
        console.warn("❌ Socket이 연결되지 않음");
        return;
      }

      console.log("🔄 PeerConnection 초기화 중...");
      const peerConnection = initializePeerConnection(true, "guest"); // 세션 ID 보존
      console.log("✅ PeerConnection 초기화 완료");

      console.log("🎤 로컬 스트림 획득 중...");
      const localStream = await initializeLocalStream();

      if (!localStream) {
        console.error("❌ 로컬 스트림 획득 실패");
        return;
      }
      console.log("✅ 로컬 스트림 획득 완료");

      // 로컬 스트림을 Peer Connection에 추가
      console.log("🔗 로컬 스트림을 PeerConnection에 추가 중...");
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        console.log("📡 트랙 추가됨:", track.kind, track.id, track.enabled, track.muted, track.readyState);
      });
      console.log("✅ 로컬 스트림 추가 완료");

      try {
        console.log("📥 원격 설명 설정 중...");
        console.log("📋 Offer 상세:", {
          type: offer.type,
          sdpLength: offer.sdp?.length,
          sdpPreview: offer.sdp?.substring(0, 200) + "...",
        });

        await peerConnection.setRemoteDescription(offer);
        console.log("✅ 원격 설명 설정 완료");
        console.log("📊 PeerConnection 상태:", {
          connectionState: peerConnection.connectionState,
          iceConnectionState: peerConnection.iceConnectionState,
          iceGatheringState: peerConnection.iceGatheringState,
          signalingState: peerConnection.signalingState,
        });

        // 큐에 저장된 ICE candidate들 처리 (비동기로 처리하여 Answer 생성 방해하지 않음)
        console.log("🔄 큐에 저장된 ICE candidate들 처리 시작...");
        flushPendingCandidates()
          .then(() => {
            console.log("✅ 큐에 저장된 ICE candidate들 처리 완료");
          })
          .catch((error) => {
            console.warn("⚠️ ICE candidate 처리 중 에러:", error);
          });
        console.log("✅ ICE candidate 처리를 백그라운드에서 시작함");

        // PeerConnection 상태 재확인
        console.log("📊 ICE candidate 처리 후 PeerConnection 상태:", {
          connectionState: peerConnection.connectionState,
          iceConnectionState: peerConnection.iceConnectionState,
          iceGatheringState: peerConnection.iceGatheringState,
          signalingState: peerConnection.signalingState,
        });

        // PeerConnection 상태 확인 (signalingState는 'closed'가 될 수 없으므로 connectionState 확인)
        if (peerConnection.connectionState === "closed") {
          console.error("❌ PeerConnection이 닫혔습니다. Answer 생성 중단");
          return;
        }

        console.log("📝 Answer 생성 중...");
        console.log("📊 Answer 생성 전 상태:", {
          connectionState: peerConnection.connectionState,
          iceConnectionState: peerConnection.iceConnectionState,
          iceGatheringState: peerConnection.iceGatheringState,
          signalingState: peerConnection.signalingState,
        });

        const answer = await peerConnection.createAnswer();
        console.log("✅ Answer 생성 완료");
        console.log("📋 Answer 상세:", {
          type: answer.type,
          sdpLength: answer.sdp?.length,
          sdpPreview: answer.sdp?.substring(0, 200) + "...",
        });

        console.log("⚙️ setLocalDescription 시작...");
        console.log("Answer 내용:", answer);

        // setLocalDescription 실행 (타임아웃 제거)
        try {
          await peerConnection.setLocalDescription(answer);
          console.log("✅ peerConnection.setLocalDescription 성공");
        } catch (error) {
          console.error("❌ setLocalDescription 실패:", error);
          throw error;
        }

        // ICE gathering 상태 확인 (선택적)
        console.log("🧊 ICE gathering 상태:", peerConnection.iceGatheringState);
        if (peerConnection.iceGatheringState === "gathering") {
          console.log("🧊 ICE gathering 진행 중...");
        }

        console.log("📤 Answer 전송 중...");
        socket.emit("answer", answer, fromSocketId);
        console.log("✅ Answer 생성 및 전송 완료");

        // Answer 전송 후 큐에 저장된 ICE candidate들 다시 처리
        await flushPendingCandidates();

        // 연결 상태 확인
        setTimeout(() => {
          console.log("🔍 Answer 전송 후 연결 상태:", {
            connectionState: peerConnection.connectionState,
            iceConnectionState: peerConnection.iceConnectionState,
            iceGatheringState: peerConnection.iceGatheringState,
            signalingState: peerConnection.signalingState,
          });
        }, 2000);
      } catch (error) {
        console.error("❌ Answer 생성 실패:", error);
      }
    },
    [socket, role, initializePeerConnection, initializeLocalStream, flushPendingCandidates],
  );

  // Answer 처리 (Host용)
  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      console.log("handleAnswer 호출됨:", {
        peerConnection: !!peerConnectionRef.current,
        role,
        answerType: answer.type,
      });

      if (!peerConnectionRef.current || role !== "host") {
        console.warn("Answer 처리 불가:", {
          peerConnection: !!peerConnectionRef.current,
          role,
        });
        return;
      }

      try {
        console.log("Answer 원격 설명 설정 중...");
        await peerConnectionRef.current.setRemoteDescription(answer);
        console.log("Answer 처리 완료");

        // 큐에 저장된 ICE candidate들 처리
        await flushPendingCandidates();

        // 연결 상태 확인
        setTimeout(() => {
          console.log("🔍 Answer 처리 후 연결 상태:", {
            connectionState: peerConnectionRef.current?.connectionState,
            iceConnectionState: peerConnectionRef.current?.iceConnectionState,
            iceGatheringState: peerConnectionRef.current?.iceGatheringState,
            signalingState: peerConnectionRef.current?.signalingState,
          });
        }, 2000);
      } catch (error) {
        console.error("Answer 처리 실패:", error);
      }
    },
    [role, flushPendingCandidates],
  );

  // ICE Candidate 처리 - 세션 ID 검증 개선
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate, sessionId?: string) => {
    const pc = peerConnectionRef.current;

    console.log("🧊 ICE candidate 수신:", {
      receivedSessionId: sessionId,
      currentSession: currentSessionIdRef.current,
      sessionMatch: sessionId === currentSessionIdRef.current,
    });

    // 세션 ID가 다르면 무시 (단, 세션 ID가 없는 경우는 허용)
    if (sessionId && currentSessionIdRef.current && sessionId !== currentSessionIdRef.current) {
      console.warn("⚠️ 세션 ID 불일치로 ICE candidate 무시:", {
        received: sessionId,
        current: currentSessionIdRef.current,
      });
      return;
    }

    // PeerConnection이 없는 경우 큐에 저장
    if (!pc) {
      console.warn("PeerConnection이 없거나 닫힌 상태이므로 ICE candidate를 큐에 저장합니다");
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    // remote description이 설정되지 않은 경우 큐에 저장
    if (!pc.remoteDescription) {
      console.warn("Remote description이 없어서 ICE candidate를 큐에 저장합니다");
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    // 즉시 추가 시도 - 실패해도 계속 진행
    try {
      await pc.addIceCandidate(candidate);
      console.log("✅ ICE candidate 추가 완료");
    } catch (error) {
      console.warn("⚠️ ICE candidate 추가 실패하지만 계속 진행:", error);
      // 실패해도 큐에 저장하지 않고 무시
    }
  }, []);

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!socket) return;

    console.log("🔌 Socket 이벤트 리스너 등록 중...");

    socket.on("offer", createAnswer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", (data: { candidate: RTCIceCandidate; sessionId?: string }) => {
      handleIceCandidate(data.candidate, data.sessionId);
    });

    console.log("✅ Socket 이벤트 리스너 등록 완료");

    return () => {
      console.log("🔌 Socket 이벤트 리스너 해제 중...");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket, createAnswer, handleAnswer, handleIceCandidate]);

  // 컴포넌트 정리 (언마운트 시)
  useEffect(() => {
    return () => {
      console.log("🧹 useWebRTC 정리 시작...");

      // 로컬 스트림 정리
      if (webrtcState.localStream) {
        console.log("🎤 로컬 스트림 정리 중...");
        webrtcState.localStream.getTracks().forEach((track) => {
          track.stop();
          console.log("🛑 트랙 정지:", track.kind, track.id);
        });
      }

      // PeerConnection 정리
      cleanupPeerConnection();

      console.log("✅ useWebRTC 정리 완료");
    };
  }, []); // 언마운트 시에만 cleanup

  // 송신 스트림 설정 (호스트용 - AI 응답을 게스트에게 전송)
  const setOutgoingStream = useCallback(
    async (stream: MediaStream | null) => {
      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) {
        console.warn("!! PeerConnection이 없어서 송신 스트림을 설정할 수 없습니다");
        return;
      }

      if (role !== "host") {
        console.warn("!! 호스트만 송신 스트림을 설정할 수 있습니다");
        return;
      }

      try {
        // 안전장치: 트랜시버가 없으면 하나 생성해 둔다
        if (!aiSenderRef.current) {
          const tx = peerConnection.addTransceiver("audio", { direction: "sendrecv" });
          aiSenderRef.current = tx.sender;
          console.log("🎛️ (late) audio transceiver 생성");
        }

        // 기존 송신 트랙들 제거
        const senders = peerConnection.getSenders();
        senders.forEach((sender) => {
          if (sender.track) {
            console.log("!! 🗑️ 기존 송신 트랙 제거:", sender.track.kind, sender.track.id);
            peerConnection.removeTrack(sender);
          }
        });

        // AI 응답 트랙 교체
        const track = stream?.getAudioTracks()[0] || null;
        await aiSenderRef.current.replaceTrack(track);
        console.log("📡 replaceTrack 완료:", track?.id);
        // // 새 스트림 추가
        // if (stream) {
        //   stream.getTracks().forEach((track) => {
        //     peerConnection.addTrack(track, stream);
        //     console.log("!! 📡 송신 트랙 추가:", track.kind, track.id);
        //   });
        // }

        setWebRTCState((prev) => ({
          ...prev,
          outgoingStream: stream,
        }));

        console.log("!! ✅ 송신 스트림 설정 완료");
      } catch (error) {
        console.error("❌ 송신 스트림 설정 실패:", error);
      }
    },
    [role],
  );

  return {
    ...webrtcState,
    createOffer,
    initializeLocalStream,
    setOutgoingStream,
    cleanup: cleanupPeerConnection,
  };
}
