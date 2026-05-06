import { ANALYTICS_EVENT_NAMES } from "@/lib/logger";

const VALID_EVENT_NAMES = new Set<string>(ANALYTICS_EVENT_NAMES);

export async function POST(request: Request) {
  const payload = await request.json().catch(() => [] as unknown);
  const events = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? [payload] : [];
  const validEvents = events.filter((event) => {
    if (!event || typeof event !== "object") {
      return false;
    }

    const candidate = event as Record<string, unknown>;
    return (
      typeof candidate.name === "string" &&
      VALID_EVENT_NAMES.has(candidate.name) &&
      typeof candidate.sessionId === "string" &&
      typeof candidate.profile === "string" &&
      typeof candidate.screen === "string" &&
      typeof candidate.timestamp === "string"
    );
  });

  if (validEvents.length) {
    console.info("worm-ranch-events", JSON.stringify(validEvents));
  }

  return Response.json({ ok: true, count: validEvents.length });
}
