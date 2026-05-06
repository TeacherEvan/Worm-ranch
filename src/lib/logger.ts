import type { DisplayProfile } from "@/game/detection";

export type EventName =
  | "app_opened"
  | "screen_viewed"
  | "settings_changed"
  | "gameplay_started"
  | "worm_collected"
  | "worm_tagged"
  | "worm_teleported"
  | "worm_escaped"
  | "gameplay_ended";

export type AnalyticsEvent = {
  name: EventName;
  sessionId: string;
  profile: DisplayProfile;
  screen: string;
  details?: Record<string, unknown>;
  timestamp: string;
};

type SilentLogger = {
  log: (event: Omit<AnalyticsEvent, "timestamp">) => void;
  dispose: () => void;
};

export function createSilentLogger(endpoint: string): SilentLogger {
  const queue: AnalyticsEvent[] = [];
  let timer: number | null = null;

  const flush = () => {
    if (!queue.length) {
      return;
    }

    const payload = JSON.stringify(queue.splice(0));

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  };

  const handlePageHide = () => {
    flush();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", handlePageHide);
  }

  return {
    log(event) {
      queue.push({
        ...event,
        timestamp: new Date().toISOString(),
      });

      if (timer) {
        return;
      }

      timer = window.setTimeout(() => {
        timer = null;
        flush();
      }, 350);
    },
    dispose() {
      if (timer) {
        window.clearTimeout(timer);
      }

      flush();

      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", handlePageHide);
      }
    },
  };
}
