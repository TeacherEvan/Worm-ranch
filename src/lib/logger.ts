import type { DisplayProfile } from "@/game/detection";

export const ANALYTICS_EVENT_NAMES = [
  "app_opened",
  "profile_detected",
  "screen_viewed",
  "settings_changed",
  "round_started",
  "worm_collected",
  "worm_teleported",
  "worm_morphed",
  "first_touch_rush_triggered",
  "ghost_finale_started",
  "round_ended",
] as const;

export type EventName = (typeof ANALYTICS_EVENT_NAMES)[number];

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
  let pageHideAttached = false;

  const flushWithFetch = (payload: string) => {
    if (typeof fetch !== "function") {
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  };

  const flush = () => {
    if (!queue.length) {
      return;
    }

    const payload = JSON.stringify(queue.splice(0));

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        const blob = new Blob([payload], { type: "application/json" });
        if (navigator.sendBeacon(endpoint, blob)) {
          return;
        }
      } catch {
        // Fall back to fetch when sendBeacon is unavailable or rejects the payload.
      }
    }

    flushWithFetch(payload);
  };

  const handlePageHide = () => {
    flush();
  };

  const attachPageHideListener = () => {
    if (pageHideAttached || typeof window === "undefined") {
      return;
    }

    window.addEventListener("pagehide", handlePageHide);
    pageHideAttached = true;
  };

  return {
    log(event) {
      attachPageHideListener();

      queue.push({
        ...event,
        timestamp: new Date().toISOString(),
      });

      if (typeof window === "undefined") {
        flush();
        return;
      }

      if (timer) {
        return;
      }

      timer = window.setTimeout(() => {
        timer = null;
        flush();
      }, 350);
    },
    dispose() {
      if (typeof window !== "undefined" && timer) {
        window.clearTimeout(timer);
        timer = null;
      }

      flush();

      if (pageHideAttached && typeof window !== "undefined") {
        window.removeEventListener("pagehide", handlePageHide);
        pageHideAttached = false;
      }
    },
  };
}
