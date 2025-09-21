"use client";

import { useVoiceRelayHost } from "@/hooks/useVoiceRelayHost";
import { useHostInitialization } from "@/hooks/useHostInitialization";
import { useGuestConnection } from "@/hooks/useGuestConnection";
import { useVoiceRelaySetup } from "@/hooks/useVoiceRelaySetup";
import {
  PageHeader,
  InitializationSection,
  ConnectionStatus,
  ConversationStatus,
  ErrorDisplay,
  UsageInstructions,
  Navigation,
} from "@/components/host";

export default function HostPage() {
  const voiceRelay = useVoiceRelayHost();

  const { roomId, hostName, setHostName, isInitializing, connectionSteps, setConnectionSteps, handleInitialize } =
    useHostInitialization(voiceRelay);

  useGuestConnection({ voiceRelay, setConnectionSteps });
  useVoiceRelaySetup({ voiceRelay });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <PageHeader />

        {!roomId && (
          <InitializationSection
            hostName={hostName}
            onHostNameChange={setHostName}
            onInitialize={handleInitialize}
            isInitializing={isInitializing}
          />
        )}

        {roomId && <ConnectionStatus roomId={roomId} connectionSteps={connectionSteps} voiceRelay={voiceRelay} />}

        {voiceRelay.isRelayActive && (
          <ConversationStatus
            currentSpeaker={voiceRelay.currentSpeaker}
            isGuestConnected={voiceRelay.isGuestConnected}
            guestAudioLevel={voiceRelay.guestAudioLevel}
          />
        )}

        <ErrorDisplay error={voiceRelay.error} onClearError={voiceRelay.clearError} />

        <UsageInstructions />

        <Navigation />
      </div>
    </div>
  );
}
