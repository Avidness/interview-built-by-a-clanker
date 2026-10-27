import { test, expect } from "@playwright/test";
import { PERSONAS, TOTAL_PERSONAS, personaCard, personaCards } from "./helpers";

// Seed prices (apps/api/src/db.ts): 34.99, 39.99, 44.99, 49.99 x2, 54.99 x2,
// 59.99 x2, 64.99, 69.99, 74.99, 79.99, 89.99, 99.99.

test.describe("Price range filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(personaCards(page)).toHaveCount(TOTAL_PERSONAS);
  });

  test("filters by minimum price", async ({ page }) => {
    await page.getByLabel("Min price").fill("80");
    await expect(page).toHaveURL(/minPrice=80/);

    await expect(personaCards(page)).toHaveCount(2);
    await expect(personaCard(page, PERSONAS.zara.name)).toBeVisible();
    await expect(personaCard(page, PERSONAS.carl.name)).toBeVisible();
  });

  test("filters by maximum price", async ({ page }) => {
    await page.getByLabel("Max price").fill("40");
    await expect(page).toHaveURL(/maxPrice=40/);

    await expect(personaCards(page)).toHaveCount(2);
    await expect(personaCard(page, PERSONAS.olivia.name)).toBeVisible();
    await expect(personaCard(page, "A11y Alex")).toBeVisible();
  });

  test("combines min and max into a range", async ({ page }) => {
    await page.getByLabel("Min price").fill("50");
    await page.getByLabel("Max price").fill("60");
    await expect(page).toHaveURL(/minPrice=50/);
    await expect(page).toHaveURL(/maxPrice=60/);

    await expect(personaCards(page)).toHaveCount(4);
    await expect(personaCard(page, PERSONAS.rex.name)).toHaveCount(0);
  });

  test("clearing the input removes the param and restores the full list", async ({ page }) => {
    await page.getByLabel("Max price").fill("40");
    await expect(personaCards(page)).toHaveCount(2);

    await page.getByLabel("Max price").fill("");
    await expect(page).not.toHaveURL(/maxPrice=/);
    await expect(personaCards(page)).toHaveCount(TOTAL_PERSONAS);
  });

  test("typing a price puts it in the URL", async ({ page }) => {
    await page.getByLabel("Min price").fill("80");
    await expect(page).toHaveURL(/minPrice=80/);
    await page.getByLabel("Max price").fill("95");
    await expect(page).toHaveURL(/maxPrice=95/);

    await page.getByLabel("Min price").fill("");
    await expect(page).not.toHaveURL(/minPrice=/);
    await expect(page).toHaveURL(/maxPrice=95/);
  });

  test("shows the active range from the URL on a fresh load", async ({ page }) => {
    await page.goto("/?maxPrice=40");
    await expect(page.getByLabel("Max price")).toHaveValue("40");
    await expect(page.getByLabel("Min price")).toHaveValue("");
    await expect(personaCards(page)).toHaveCount(2);
    await expect(personaCard(page, PERSONAS.olivia.name)).toBeVisible();
    await expect(personaCard(page, "A11y Alex")).toBeVisible();
  });
});
