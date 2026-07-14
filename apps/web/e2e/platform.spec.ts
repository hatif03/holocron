import { test, expect } from "@playwright/test";

test.describe("Holocron platform", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Holocron/i);
  });

  test("research graph page renders", async ({ page }) => {
    await page.goto("/research-graph");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("paper generation page renders", async ({ page }) => {
    await page.goto("/paper-generation");
    await expect(page.getByText(/paper generation|generate/i).first()).toBeVisible();
  });

  test("references page renders", async ({ page }) => {
    await page.goto("/references");
    await expect(page.getByText(/reference/i).first()).toBeVisible();
  });

  test("settings page renders", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/settings|llm|provider/i).first()).toBeVisible();
  });

  test("health endpoint returns ok", async ({ request }) => {
    const resp = await request.get("/health");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.status).toBe("ok");
  });
});
