"use client";

import ConnectionStatus from "@/components/ConnectionStatus";
import { VoiceRelayClient } from "@/hooks/useVoiceRelayGuest";
import { PageHeader, ConversationDisplay, UsageInstructions, ErrorDisplay, Navigation } from "@/components/guest-chat";

interface Props {
  voiceRelay: VoiceRelayClient;
}

export default function GuestChatRoom({ voiceRelay }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-md mx-auto">
        <PageHeader />

        <ConnectionStatus voiceRelay={voiceRelay} />

        <ConversationDisplay
          currentSpeaker={voiceRelay.currentSpeaker}
          webRTCState={voiceRelay.webRTCState}
          microphoneLevel={voiceRelay.microphoneLevel}
        />

        <UsageInstructions />

        <ErrorDisplay error={voiceRelay.error} onClearError={voiceRelay.clearError} />

        <Navigation />
      </div>
    </div>
  );
}
