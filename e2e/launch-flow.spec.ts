import { expect, test, type Page } from "@playwright/test";

/* The shell funnels every display hand-off through a timed transition screen
   (220ms, 0 under reduced motion — WormRanchApp.tsx). Asserting on the
   destination directly would race that timer, so the helpers below wait on the
   shell's own state with a generous timeout instead of a fixed sleep. */
const NAV_TIMEOUT_MS = 5_000;

async function openShell(page: Page) {
  await page.goto("/");
  await expect(page.locator('[data-hero-stage="full-bleed"]')).toBeVisible();
}

async function openGateToHome(page: Page) {
  await openShell(page);
  await page.getByRole("button", { name: "Open the gate" }).click();
  await expect(page.locator('[data-layout="compact-launch"]')).toBeVisible({ timeout: NAV_TIMEOUT_MS });
}

async function startMode(page: Page, modeName: RegExp) {
  await openGateToHome(page);
  await page.getByRole("button", { name: "Start roundup" }).click();

  const modeDialog = page.getByRole("dialog", { name: "Choose Game Mode" });
  await expect(modeDialog).toBeVisible({ timeout: NAV_TIMEOUT_MS });

  await modeDialog.getByRole("button", { name: modeName }).click();
  await modeDialog.getByRole("button", { name: "Start Roundup" }).click();

  await expect(page.getByLabel("Worm Ranch game field")).toBeVisible({ timeout: NAV_TIMEOUT_MS });
}

test.describe("launch surface", () => {
  test("renders the title-first welcome hero with its copy and actions", async ({ page }) => {
    await openShell(page);

    await expect(page.getByText("Open the gate, or rig the tack first.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open the gate" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rig the tack" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open the gate" })).toBeFocused();
  });

  test("exposes the full-bleed hero overlay contract", async ({ page }) => {
    await openShell(page);

    await expect(page.locator('[data-hero-stage="full-bleed"]')).toBeVisible();
    await expect(page.locator('[data-hero-copy-layer="overlay"]')).toBeVisible();

    /* Two elements carry data-launch-loader-state: the hero media surface and
       the loader plate itself (which hard-codes "loading" while mounted).
       Scope to the media surface so the assertion reads the real gate. */
    const heroSurface = page.locator('[data-hero-media-surface="full-bleed"]');
    await expect(heroSurface).toHaveAttribute("data-launch-loader-state", "ready", { timeout: 15_000 });
  });

  test("walks welcome -> mode menu -> standard game", async ({ page }) => {
    await startMode(page, /Standard Run/);

    const stage = page.locator('[data-phase]');
    await expect(stage).toBeVisible();
    await expect(page.getByLabel("worms killed")).toBeVisible();
  });

  test("surfaces the active target color in endless mode", async ({ page }) => {
    await startMode(page, /Endless Target Color/);

    /* The HUD must teach the current objective through live feedback rather
       than a static rules block. The callout only mounts once the engine
       publishes a target, so this waits on the engine, not on a fixed delay.
       Read the automation contract (data-target-*) instead of parsing copy. */
    const callout = page.locator("[data-target-callout]");
    await expect(callout).toBeVisible({ timeout: 10_000 });
    await expect(callout).toContainText(/TAP (YELLOW|RED|BLUE|GREEN|ORANGE|PURPLE)/);
    await expect(callout).toHaveAttribute("data-target-color", /sun-yellow|fence-red|pond-blue|clover-green|blaze-orange|shock-purple/);
    await expect(callout).toHaveAttribute("data-target-progress", /^\d+$/);
    await expect(callout).toHaveAttribute("data-target-goal", /^\d+$/);
    await expect(callout).toHaveAttribute("data-target-game-over", "false");
  });

  test("marks the endless stage as continuous", async ({ page }) => {
    await startMode(page, /Endless Target Color/);

    await expect(page.locator('[data-phase]')).toHaveAttribute("data-motion", /full|reduced/);
    await expect(page.getByLabel("Worm Ranch game field")).toBeVisible();
  });
});

test.describe("canvas pointer input", () => {
  /* jsdom doubles cannot exercise real browser pointer capture or ordering,
     and the binder routes by pointerType. Touch emulation drives the swipe
     path end to end; the mouse check guards the direct-press path (the
     setPointerCapture NotFoundError class the binder had to defend against). */
  test.use({ hasTouch: true });

  test("advances the keyboard target from a real touch swipe on the game field", async ({ page }) => {
    await startMode(page, /Standard Run/);

    const field = page.getByLabel("Worm Ranch game field");
    await expect(field).toBeVisible({ timeout: NAV_TIMEOUT_MS });
    await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "activeChase");

    const status = page.locator('[data-phase] [aria-live="polite"]');
    await expect(status).toContainText(/Target worm \d+\./);
    const initialTarget = await status.textContent();

    const box = await field.boundingBox();
    if (!box) throw new Error("game field has no layout box");
    const y = box.y + box.height / 2;
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + 50, y, id: 1 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: box.x + 150, y, id: 1 }],
    });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await expect(status).not.toHaveText(initialTarget ?? "");
    await expect(status).toContainText(/Target worm \d+\./);
  });

  test("survives a real mouse press on the game field", async ({ page }) => {
    await startMode(page, /Standard Run/);

    const field = page.getByLabel("Worm Ranch game field");
    await expect(field).toBeVisible({ timeout: NAV_TIMEOUT_MS });
    await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "activeChase");

    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const box = await field.boundingBox();
    if (!box) throw new Error("game field has no layout box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();

    await expect(page.locator("[data-phase]")).toHaveAttribute(
      "data-phase",
      /activeChase|blinkBand|ghostFinale|gameOver/,
    );
    expect(errors).toEqual([]);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the launch flow usable with reduced motion", async ({ page }) => {
    await openShell(page);
    await expect(page.getByRole("button", { name: "Open the gate" })).toBeVisible();

    await page.getByRole("button", { name: "Open the gate" }).click();
    await expect(page.locator('[data-layout="compact-launch"]')).toBeVisible();
  });
});
