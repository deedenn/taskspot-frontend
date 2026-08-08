import { expect, test } from "@playwright/test";

test("landing page opens on desktop and mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Taskspot/i).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText(/Taskspot/i).first()).toBeVisible();
});
