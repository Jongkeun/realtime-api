import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface OpenAIMessage {
  type: string;
  [key: string]: unknown;
}

interface RealtimeState {
  isConnected: boolean;
  isSessionActive: boolean;
  lastError: string | null;
  conversationId: string | null;
}

interface OpenAICallbacks {
  onAudioResponse?: (audioData: string) => void; // AI 응답 오디오 콜백
  onResponseComplete?: () => void; // AI 응답 완료 콜백
}

export function useOpenAIRealtime(callbacks?: OpenAICallbacks) {
  const callbacksRef = useRef<OpenAICallbacks | undefined>(callbacks);
  const socketRef = useRef<Socket | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    isConnected: false,
    isSessionActive: false,
    lastError: null,
    conversationId: null,
  });

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Socket.IO를 통한 OpenAI Realtime API 연결
  const connectToOpenAI = useCallback(async () => {
    try {
      // Socket.IO 서버에 연결
      const socket = io("http://localhost:3000");

      socket.on("connect", () => {
        console.log("Socket.IO 서버에 연결됨");

        // OpenAI 연결 요청
        socket.emit("connect-openai", (response: { success?: boolean; error?: string }) => {
          if (response.success) {
            console.log("OpenAI Realtime API 연결 요청 성공");
          } else {
            console.error("OpenAI 연결 실패:", response.error);
            setRealtimeState((prev) => ({
              ...prev,
              lastError: response.error || "연결 실패",
              isConnected: false,
              isSessionActive: false,
            }));
          }
        });
      });

      // OpenAI 연결 성공 이벤트
      socket.on("openai-connected", () => {
        console.log("OpenAI Realtime API에 연결됨");
        setRealtimeState((prev) => ({
          ...prev,
          isConnected: true,
          isSessionActive: true,
          lastError: null,
          conversationId: "connected",
        }));
      });

      // OpenAI 메시지 수신
      socket.on("openai-message", (message: OpenAIMessage) => {
        console.log("OpenAI 메시지 수신:", message.type);

        // 다양한 이벤트 타입 처리
        switch (message.type) {
          case "conversation.item.created":
          case "conversation.item.completed":
            console.log("대화 이벤트:", message);
            break;
          case "response.audio.delta":
            // 오디오 데이터 처리
            if (message.delta && callbacks?.onAudioResponse) {
              console.log("오디오 델타 수신, 콜백 호출");
              callbacksRef.current?.onAudioResponse?.(message.delta as string);
            }
            break;
          case "response.done":
            console.log("🎯 AI 응답 완료");
            if (callbacks?.onResponseComplete) {
              callbacksRef.current?.onResponseComplete?.();
            }
            break;
          case "error":
            console.error("서버 오류:", message.error);
            break;
        }
      });

      // OpenAI 오류 이벤트
      socket.on("openai-error", (error: string) => {
        console.error("OpenAI 오류:", error);
        setRealtimeState((prev) => ({
          ...prev,
          lastError: error,
          isConnected: false,
          isSessionActive: false,
        }));
      });

      // OpenAI 연결 해제 이벤트
      socket.on("openai-disconnected", () => {
        console.log("OpenAI 연결 해제됨");
        setRealtimeState((prev) => ({
          ...prev,
          isConnected: false,
          isSessionActive: false,
        }));
      });

      socket.on("disconnect", () => {
        console.log("Socket.IO 서버 연결 해제됨");
        setRealtimeState((prev) => ({
          ...prev,
          isConnected: false,
          isSessionActive: false,
        }));
      });

      socketRef.current = socket;
      return true;
    } catch (error) {
      console.error("연결 실패:", error);
      setRealtimeState((prev) => ({
        ...prev,
        lastError: error instanceof Error ? error.message : "연결 초기화에 실패했습니다",
        isConnected: false,
        isSessionActive: false,
      }));
      return false;
    }
  }, [callbacks]);

  // 오디오 데이터 전송
  const sendAudioData = useCallback(
    (audioData: ArrayBuffer) => {
      const socket = socketRef.current;
      if (!socket || !realtimeState.isConnected) {
        console.warn("Socket.IO가 연결되어 있지 않습니다");
        return;
      }

      // ArrayBuffer를 base64로 인코딩하여 전송
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)));
      const message: OpenAIMessage = {
        type: "input_audio_buffer.append",
        audio: base64Audio,
      };

      socket.emit("send-openai-message", message);
    },
    [realtimeState.isConnected],
  );

  // 대화 시작 (응답 생성 요청)
  const startConversation = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !realtimeState.isConnected) {
      console.warn("Socket.IO가 연결되어 있지 않습니다");
      return;
    }

    // 입력 오디오 커밋 및 응답 생성 요청
    const commitMessage: OpenAIMessage = {
      type: "input_audio_buffer.commit",
    };

    const responseMessage: OpenAIMessage = {
      type: "response.create",
    };

    socket.emit("send-openai-message", commitMessage);
    socket.emit("send-openai-message", responseMessage);
  }, [realtimeState.isConnected]);

  // 텍스트 메시지 전송
  const sendTextMessage = useCallback(
    (text: string) => {
      const socket = socketRef.current;
      if (!socket || !realtimeState.isConnected) {
        console.warn("Socket.IO가 연결되어 있지 않습니다");
        return;
      }

      const message: OpenAIMessage = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: text,
            },
          ],
        },
      };

      socket.emit("send-openai-message", message);

      // 응답 생성 요청
      const responseMessage: OpenAIMessage = {
        type: "response.create",
      };

      socket.emit("send-openai-message", responseMessage);
    },
    [realtimeState.isConnected],
  );

  // 연결 해제
  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      try {
        socket.emit("disconnect-openai");
        socket.disconnect();
      } catch (error) {
        console.error("Socket.IO 연결 해제 중 오류:", error);
      }
      socketRef.current = null;
    }

    setRealtimeState({
      isConnected: false,
      isSessionActive: false,
      lastError: null,
      conversationId: null,
    });
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      const socket = socketRef.current;
      if (socket) {
        try {
          socket.emit("disconnect-openai");
          socket.disconnect();
        } catch (error) {
          console.error("Socket.IO 연결 해제 중 오류:", error);
        }
        socketRef.current = null;
      }

      setRealtimeState({
        isConnected: false,
        isSessionActive: false,
        lastError: null,
        conversationId: null,
      });
    };
  }, []);

  return {
    ...realtimeState,
    connectToOpenAI,
    sendAudioData,
    sendTextMessage,
    startConversation,
    disconnect,
  };
}
