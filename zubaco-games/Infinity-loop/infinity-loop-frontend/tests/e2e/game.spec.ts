import { expect, test } from "@playwright/test";

test("game shell renders welcome modal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Welcome to Infinity Loop")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start Game", exact: true }),
  ).toBeVisible();
});

test("settings drawer opens and complexity is disabled", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByText("Complexity selection is temporarily disabled."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "easy" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "medium" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "hard" })).toBeDisabled();
  const soundSwitch = page.getByRole("switch", { name: "Audio Effects" });
  if ((await soundSwitch.getAttribute("aria-checked")) === "false") {
    await soundSwitch.click();
  }
  await expect(soundSwitch).toHaveAttribute("aria-checked", "true");
});

test("sound switch toggles in settings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open settings" }).click();
  const soundSwitch = page.getByRole("switch", { name: "Audio Effects" });

  await expect(soundSwitch).toHaveAttribute("aria-checked", "true");
  await soundSwitch.click();
  await expect(soundSwitch).toHaveAttribute("aria-checked", "false");
});
