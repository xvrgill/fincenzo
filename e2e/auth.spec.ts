import { expect, test } from "@playwright/test";

test.describe("auth gate", () => {
  test("unauthenticated visit to / redirects to /sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("sign-in page renders the form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Welcome back to Fincenzo.")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
