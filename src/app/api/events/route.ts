export async function POST(request: Request) {
  const payload = (await request.json()) as unknown;
  const events = Array.isArray(payload) ? payload : [];
  const validEvents = events.filter((event) => {
    if (!event || typeof event !== "object") {
      return false;
    }

    const candidate = event as Record<string, unknown>;
    return (
      typeof candidate.name === "string" &&
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
