"use client";

import { useCallback, useEffect, useState } from "react";

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isDeferredInstallPromptEvent(event: Event): event is DeferredInstallPromptEvent {
  return "prompt" in event && "userChoice" in event;
}

export function useInstallPrompt(): {
  installPromptEvent: DeferredInstallPromptEvent | null;
  installPromptDismissed: boolean;
  setInstallPromptDismissed: (value: boolean) => void;
  onInstall: () => void;
} {
  const [installPromptEvent, setInstallPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isDeferredInstallPromptEvent(event)) {
        return;
      }

      event.preventDefault();
      setInstallPromptEvent(event);
      setInstallPromptDismissed(false);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setInstallPromptDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const onInstall = useCallback(async () => {
    if (!installPromptEvent) {
      return;
    }

    const pendingPrompt = installPromptEvent;
    await pendingPrompt.prompt();
    await pendingPrompt.userChoice;
    setInstallPromptEvent(null);
    setInstallPromptDismissed(true);
  }, [installPromptEvent]);

  return {
    installPromptEvent,
    installPromptDismissed,
    setInstallPromptDismissed,
    onInstall,
  };
}
