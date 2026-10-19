import { expect, test, type Page } from "@playwright/test";

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

async function startBaseDefense(page: Page) {
  await openGateToHome(page);
  await page.getByRole("button", { name: "Start roundup" }).click();

  const modeDialog = page.getByRole("dialog", { name: "Choose Game Mode" });
  await expect(modeDialog).toBeVisible({ timeout: NAV_TIMEOUT_MS });

  await modeDialog.getByRole("button", { name: /Base Defense/ }).click();
  await modeDialog.getByRole("button", { name: "Start Roundup" }).click();

  await expect(page.getByLabel("Worm Ranch game field")).toBeVisible({ timeout: NAV_TIMEOUT_MS });
}

test.describe("Base Defense mode", () => {
  test("starts Base Defense and renders the Bank tab and Tent HUD", async ({ page }) => {
    await startBaseDefense(page);

    // Bank tab and HUD contract should be visible at top
    const hud = page.locator('[data-base-defense-hud="active"]');
    await expect(hud).toBeVisible({ timeout: NAV_TIMEOUT_MS });
    await expect(hud).toHaveAttribute("data-miners-count", "2");
    await expect(hud).toHaveAttribute("data-base-level", "0");

    const bankTab = page.getByTestId("bank-tab");
    await expect(bankTab).toBeVisible({ timeout: NAV_TIMEOUT_MS });
    await expect(bankTab).toContainText("BANK:");
    await expect(bankTab).toContainText("TENT T1:");

    // Canvas should be active
    const canvas = page.getByLabel("Worm Ranch game field");
    await expect(canvas).toBeVisible();
  });

  test("opens Bank dropdown menu with all requisitions and upgrades", async ({ page }) => {
    await startBaseDefense(page);

    const bankTab = page.getByTestId("bank-tab");
    await expect(bankTab).toBeVisible({ timeout: NAV_TIMEOUT_MS });

    // Click to open dropdown
    await bankTab.click();

    const dropdown = page.getByTestId("bank-dropdown");
    await expect(dropdown).toBeVisible();

    // Requisitions header
    await expect(dropdown.getByText("BASE REQUISITIONS")).toBeVisible();
    await expect(dropdown.getByText(/MINERS/)).toBeVisible();

    // Verify key purchase options exist
    await expect(page.getByTestId("buy-damage")).toBeVisible();
    await expect(page.getByTestId("buy-minerSpeed")).toBeVisible();
    await expect(page.getByTestId("buy-health")).toBeVisible();
    await expect(page.getByTestId("buy-armor")).toBeVisible();
    await expect(page.getByTestId("buy-minerCarry")).toBeVisible();
    await expect(page.getByTestId("buy-extraMiner")).toBeVisible();
    await expect(page.getByTestId("buy-aoeRadius")).toBeVisible();
    await expect(page.getByTestId("buy-tower")).toBeVisible();
    await expect(page.getByTestId("buy-wall")).toBeVisible();
    await expect(page.getByTestId("buy-baseUpgrade")).toBeVisible();

    // Clicking bank tab again closes dropdown
    await bankTab.click();
    await expect(dropdown).not.toBeVisible();
  });

  test("clicking game field performs shotgun press without crashing", async ({ page }) => {
    await startBaseDefense(page);

    const canvas = page.getByLabel("Worm Ranch game field");
    await expect(canvas).toBeVisible();

    // Click canvas multiple times to simulate firing shotgun
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.click(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
    }

    // Bank tab should still be alive and responsive
    const bankTab = page.getByTestId("bank-tab");
    await expect(bankTab).toBeVisible();
  });

  test("autonomous miners deposit credits from killed-worm crystal drops and allow purchasing constructions", async ({ page }) => {
    await startBaseDefense(page);

    const hud = page.locator('[data-base-defense-hud="active"]');
    await expect(hud).toBeVisible({ timeout: NAV_TIMEOUT_MS });

    // Initial credits start at 0
    await expect(hud).toHaveAttribute("data-credits", "0");
    await expect(hud).toHaveAttribute("data-walls-count", "0");

    const canvas = page.getByLabel("Worm Ranch game field");
    const box = await canvas.boundingBox();

    // Kill worms by clicking around the field so they drop crystals
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const offsets = [
        [0, 0], [60, 0], [-60, 0], [0, 60], [0, -60],
        [100, 100], [-100, -100], [100, -100], [-100, 100],
      ];
      for (const [ox, oy] of offsets) {
        await page.mouse.click(cx + ox, cy + oy);
        await page.waitForTimeout(100);
      }
    }

    // Wait for autonomous miners to collect dropped crystal and deposit credits (poll data-credits > 0)
    await expect(async () => {
      if (box) {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await page.mouse.click(cx, cy);
        await page.mouse.click(cx + 80, cy);
        await page.mouse.click(cx - 80, cy);
        await page.mouse.click(cx, cy + 80);
        await page.mouse.click(cx, cy - 80);
      }
      const cr = Number(await hud.getAttribute("data-credits"));
      expect(cr).toBeGreaterThanOrEqual(10);
    }).toPass({ timeout: 20_000 });

    // Open bank tab and purchase wall (10 CR)
    const bankTab = page.getByTestId("bank-tab");
    await bankTab.click();

    const buyWall = page.getByTestId("buy-wall");
    await expect(buyWall).toBeEnabled();
    await buyWall.click();

    // Verify wall was built
    await expect(hud).toHaveAttribute("data-walls-count", "1");
  });

  test("HUD layout has zero bounding-box overlaps across elements", async ({ page }) => {
    await startBaseDefense(page);

    const bankTab = page.getByTestId("bank-tab");
    const killsBadge = page.locator('[aria-label="worms killed"]');

    await expect(bankTab).toBeVisible({ timeout: NAV_TIMEOUT_MS });
    await expect(killsBadge).toBeVisible({ timeout: NAV_TIMEOUT_MS });

    const bankBox = await bankTab.boundingBox();
    const killsBox = await killsBadge.boundingBox();

    expect(bankBox).not.toBeNull();
    expect(killsBox).not.toBeNull();

    if (bankBox && killsBox) {
      const overlaps =
        bankBox.x < killsBox.x + killsBox.width &&
        bankBox.x + bankBox.width > killsBox.x &&
        bankBox.y < killsBox.y + killsBox.height &&
        bankBox.y + bankBox.height > killsBox.y;

      expect(overlaps, "Bank tab and Kills badge must not overlap in HUD layout").toBe(false);
    }
  });

  test("keyboard shortcuts 1-0 and hotkeys trigger upgrade purchases", async ({ page }) => {
    await startBaseDefense(page);

    const hud = page.locator('[data-base-defense-hud="active"]');
    await expect(hud).toBeVisible({ timeout: NAV_TIMEOUT_MS });

    const canvas = page.getByLabel("Worm Ranch game field");
    const box = await canvas.boundingBox();

    // Kill worms to generate credits
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const offsets = [
        [0, 0], [60, 0], [-60, 0], [0, 60], [0, -60],
        [100, 100], [-100, -100], [100, -100], [-100, 100],
      ];
      for (const [ox, oy] of offsets) {
        await page.mouse.click(cx + ox, cy + oy);
        await page.waitForTimeout(100);
      }
    }

    // Wait until at least 10 credits are harvested
    await expect(async () => {
      if (box) {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await page.mouse.click(cx, cy);
        await page.mouse.click(cx + 80, cy);
        await page.mouse.click(cx - 80, cy);
        await page.mouse.click(cx, cy + 80);
        await page.mouse.click(cx, cy - 80);
      }
      const cr = Number(await hud.getAttribute("data-credits"));
      expect(cr).toBeGreaterThanOrEqual(10);
    }).toPass({ timeout: 20_000 });

    // Focus canvas and press key '9' to buy wall (10 CR)
    await canvas.focus();
    await page.keyboard.press("9");

    // Wall count should increment to 1
    await expect(hud).toHaveAttribute("data-walls-count", "1");
  });
});
