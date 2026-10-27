import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

// Below Tailwind's `sm` breakpoint (640px).
test.use({ viewport: { width: 375, height: 667 } });

test.describe("Mobile navigation (GAPS 1.4)", () => {
  test("guests can reach Browse from the nav on a phone-sized screen", async ({ page }) => {
    await page.goto("/login");
    const browse = page.getByRole("navigation").getByRole("link", { name: "Browse" });
    await expect(browse).toBeVisible();
    await browse.click();
    await expect(page).toHaveURL("/");
  });

  test("signed-in users can reach Favorites from the nav on a phone-sized screen", async ({ page, request }) => {
    await loginAs(page, request);
    const favorites = page.getByRole("navigation").getByRole("link", { name: "Favorites" });
    await expect(favorites).toBeVisible();
    await favorites.click();
    await expect(page).toHaveURL("/favorites");
    await expect(page.getByRole("heading", { name: "Your Favorites" })).toBeVisible();
  });
});
