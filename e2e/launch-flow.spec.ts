import { expect, test, type Page } from "@playwright/test";

/* The shell funnels every display hand-off through a timed transition screen.
   Asserting on the destination directly would race that timer, so the helpers
   below always start from a named screen and wait on the shell's own state. */
const TRANSITION_MS = 400;

async function openShell(page: Page) {
  await page.goto("/");
  await expect(page.locator('[data-hero-stage="full-bleed"]')).toBeVisible();
}

async function openGateToHome(page: Page) {
  await openShell(page);
  await page.getByRole("button", { name: "Open the gate" }).click();
  await expect(page.locator('[data-layout="compact-launch"]')).toBeVisible({ timeout: TRANSITION_MS });
}

async function startMode(page: Page, modeName: RegExp) {
  await openGateToHome(page);
  await page.getByRole("button", { name: "Start roundup" }).click();

  const modeDialog = page.getByRole("dialog", { name: "Choose Game Mode" });
  await expect(modeDialog).toBeVisible({ timeout: TRANSITION_MS });

  await modeDialog.getByRole("button", { name: modeName }).click();
  await modeDialog.getByRole("button", { name: "Start Roundup" }).click();

  await expect(page.getByLabel("Worm Ranch game field")).toBeVisible({ timeout: TRANSITION_MS + 2000 });
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
       publishes a target, so this waits on the engine, not on a fixed delay. */
    const callout = page.locator("[data-target-callout]");
    await expect(callout).toBeVisible({ timeout: 10_000 });
    await expect(callout).toContainText(/TAP (YELLOW|RED|BLUE|GREEN|ORANGE|PURPLE)/);
    await expect(callout).toContainText(/\d+\/\d+/);
    await expect(callout).toHaveAttribute("data-target-color", /sun-yellow|fence-red|pond-blue|clover-green|blaze-orange|shock-purple/);
    await expect(callout).toHaveAttribute("data-target-game-over", "false");
  });

  test("marks the endless stage as continuous", async ({ page }) => {
    await startMode(page, /Endless Target Color/);

    await expect(page.locator('[data-phase]')).toHaveAttribute("data-motion", /full|reduced/);
    await expect(page.getByLabel("Worm Ranch game field")).toBeVisible();
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
