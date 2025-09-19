import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents, UserRole } from "@/types/socket";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// WebRTC 설정 - 타임아웃 문제 해결을 위한 최적화
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 0, // ICE candidate pool 비활성화 (타임아웃 방지)
  iceTransportPolicy: "all",
  bundlePolicy: "balanced", // 더 호환성 좋은 설정
  rtcpMuxPolicy: "require",
};

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: true, // 최소한의 오디오 설정
  video: false,
};

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
}

export function useWebRTC(socket: TypedSocket | null, role: UserRole | null, remoteSocketId: string | null) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [webrtcState, setWebRTCState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
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

  // Peer Connection 초기화
  const initializePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      console.log("🔄 기존 PeerConnection 정리 중...");
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    console.log("🆕 새로운 PeerConnection 생성 중...");
    const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionRef.current = peerConnection;

    // 연결 상태 모니터링
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      setWebRTCState((prev) => ({
        ...prev,
        connectionState: state,
        isConnected: state === "connected",
      }));
      console.log("🔗 WebRTC 상태:", state);

      if (state === "failed") {
        console.error("❌ WebRTC 연결 실패");
      }
    };

    // ICE 연결 상태 모니터링
    peerConnection.oniceconnectionstatechange = () => {
      console.log("🧊 ICE 연결 상태:", peerConnection.iceConnectionState);
    };

    // 원격 스트림 수신
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setWebRTCState((prev) => ({
        ...prev,
        remoteStream,
      }));
      console.log("🎧 원격 스트림 수신됨");
    };

    // ICE candidate 처리
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket && remoteSocketId) {
        socket.emit("ice-candidate", event.candidate, remoteSocketId);
        console.log("🧊 ICE candidate 전송", {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
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
  }, [socket, remoteSocketId]);

  // Offer 생성 (Host용) - 단순화된 방식 (정상 동작 코드 패턴)
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
      const peerConnection = initializePeerConnection();
      const localStream = await initializeLocalStream();

      if (!localStream) {
        throw new Error("로컬 스트림 획득 실패");
      }

      // 트랙 추가 - 더 안전한 방식
      console.log("🎵 트랙 추가 중...");
      localStream.getTracks().forEach((track) => {
        console.log("트랙 추가:", track.kind, track.id, "상태:", track.readyState);

        // 트랙이 활성 상태인지 확인
        if (track.readyState === "live") {
          try {
            peerConnection.addTrack(track, localStream);
            console.log("✅ 트랙 추가 성공:", track.kind);
          } catch (error) {
            console.error("❌ 트랙 추가 실패:", error);
            throw error;
          }
        } else {
          console.warn("⚠️ 트랙이 비활성 상태:", track.readyState);
        }
      });

      // PeerConnection 상태 확인
      console.log("PeerConnection 초기 상태:", {
        connectionState: peerConnection.connectionState,
        iceGatheringState: peerConnection.iceGatheringState,
        iceConnectionState: peerConnection.iceConnectionState,
        signalingState: peerConnection.signalingState,
      });

      // **단순화**: 정상 동작 코드 패턴 적용
      console.log("📝 Offer 생성 중...");
      let offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
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

      // setLocalDescription을 근본적으로 해결
      try {
        console.log("⏳ setLocalDescription 시작...");

        // setLocalDescription 호출 (ICE gathering 대기 없이)
        console.log("setLocalDescription 호출 중...");
        await peerConnection.setLocalDescription(offer);
        console.log("✅ peerConnection.setLocalDescription 성공");

        // ICE gathering 상태 확인 (선택적)
        console.log("🧊 ICE gathering 상태:", peerConnection.iceGatheringState);
        if (peerConnection.iceGatheringState === "gathering") {
          console.log("🧊 ICE gathering 진행 중... (백그라운드에서 계속됨)");
        } else if (peerConnection.iceGatheringState === "complete") {
          console.log("✅ ICE gathering 이미 완료됨");
        }

        // 성공 후 상태 확인
        console.log("성공 후 상태:", {
          connectionState: peerConnection.connectionState,
          iceGatheringState: peerConnection.iceGatheringState,
          iceConnectionState: peerConnection.iceConnectionState,
          signalingState: peerConnection.signalingState,
        });
      } catch (error) {
        console.error("❌ setLocalDescription 실패:", error);
        console.log("실패 시 상태:", {
          connectionState: peerConnection.connectionState,
          iceGatheringState: peerConnection.iceGatheringState,
          iceConnectionState: peerConnection.iceConnectionState,
          signalingState: peerConnection.signalingState,
        });

        // 실패 시 대안: STUN 서버 없는 설정으로 재시도
        console.log("🔄 STUN 서버 없는 설정으로 재시도...");
        const fallbackConfig: RTCConfiguration = {
          iceServers: [], // STUN 서버 없이 시도
          iceCandidatePoolSize: 0,
        };

        const newPeerConnection = new RTCPeerConnection(fallbackConfig);
        localStream.getTracks().forEach((track) => {
          newPeerConnection.addTrack(track, localStream);
        });

        const newOffer = await newPeerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });

        await newPeerConnection.setLocalDescription(newOffer);
        console.log("✅ 재시도 성공 (STUN 서버 없이)");

        // 새로운 PeerConnection을 사용
        peerConnectionRef.current = newPeerConnection;
        offer = newOffer;
      }

      console.log("📤 Offer 전송 중...");
      socket.emit("offer", offer, remoteSocketId);
      console.log("✅ Offer 전송 완료");
    } catch (error) {
      console.error("❌ Offer 생성 실패:", error);
    }
  }, [socket, remoteSocketId, role, initializePeerConnection, initializeLocalStream]);

  // Answer 생성 (Guest용)
  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit, fromSocketId: string) => {
      console.log("createAnswer 호출됨:", {
        socket: !!socket,
        role,
        fromSocketId,
        offerType: offer.type,
        socketConnected: socket?.connected,
      });

      if (!socket || role !== "guest") {
        console.warn("Answer 생성 불가:", { socket: !!socket, role });
        return;
      }

      if (!socket.connected) {
        console.warn("❌ Socket이 연결되지 않음");
        return;
      }

      console.log("Answer 생성 시작...");
      const peerConnection = initializePeerConnection();
      const localStream = await initializeLocalStream();

      if (!localStream) {
        console.error("로컬 스트림 획득 실패");
        return;
      }

      // 로컬 스트림을 Peer Connection에 추가
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      try {
        console.log("원격 설명 설정 중...");
        await peerConnection.setRemoteDescription(offer);
        console.log("✅ 원격 설명 설정 완료");

        console.log("Answer 생성 중...");
        const answer = await peerConnection.createAnswer();
        console.log("✅ Answer 생성 완료");

        console.log("⚙️ setLocalDescription 시작...2");
        console.log("Answer 내용:", answer);

        // setLocalDescription을 타임아웃과 함께 실행
        const setLocalDescriptionPromise = peerConnection.setLocalDescription(answer);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("setLocalDescription 타임아웃 (5초)"));
          }, 5000);
        });

        try {
          await Promise.race([setLocalDescriptionPromise, timeoutPromise]);
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
      } catch (error) {
        console.error("❌ Answer 생성 실패:", error);
      }
    },
    [socket, role, initializePeerConnection, initializeLocalStream],
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
      } catch (error) {
        console.error("Answer 처리 실패:", error);
      }
    },
    [role],
  );

  // ICE Candidate 처리
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(candidate);
      console.log("ICE candidate 추가 완료");
    } catch (error) {
      console.error("ICE candidate 추가 실패:", error);
    }
  }, []);

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!socket) return;

    console.log("🔌 Socket 이벤트 리스너 등록 중...");

    socket.on("offer", createAnswer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    console.log("✅ Socket 이벤트 리스너 등록 완료");

    return () => {
      console.log("🔌 Socket 이벤트 리스너 해제 중...");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket, createAnswer, handleAnswer, handleIceCandidate]);

  // 정리
  useEffect(() => {
    return () => {
      if (webrtcState.localStream) {
        webrtcState.localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [webrtcState.localStream]);

  return {
    ...webrtcState,
    createOffer,
    initializeLocalStream,
  };
}
