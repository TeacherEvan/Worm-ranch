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

  test("autonomous miners deposit credits and allow purchasing constructions", async ({ page }) => {
    await startBaseDefense(page);

    const hud = page.locator('[data-base-defense-hud="active"]');
    await expect(hud).toBeVisible({ timeout: NAV_TIMEOUT_MS });

    // Initial credits start at 0
    await expect(hud).toHaveAttribute("data-credits", "0");
    await expect(hud).toHaveAttribute("data-walls-count", "0");

    // Wait for autonomous miners to complete crystal trip and deposit credits (poll data-credits > 0)
    await expect(async () => {
      const cr = Number(await hud.getAttribute("data-credits"));
      expect(cr).toBeGreaterThanOrEqual(10);
    }).toPass({ timeout: 15_000 });

    // Open bank tab and purchase wall (10 CR)
    const bankTab = page.getByTestId("bank-tab");
    await bankTab.click();

    const buyWall = page.getByTestId("buy-wall");
    await expect(buyWall).toBeEnabled();
    await buyWall.click();

    // Verify wall was built
    await expect(hud).toHaveAttribute("data-walls-count", "1");
  });
});
