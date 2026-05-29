import { expect, test } from "@playwright/test";

test("instructions screen shows title and Play Now", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Maze Navigation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play Now" })).toBeVisible();
});

test("instructions screen respects hindi lang query", async ({ page }) => {
  await page.goto("/?lang=hi");
  await expect(page.getByRole("button", { name: "अभी खेलें" })).toBeVisible();
});
