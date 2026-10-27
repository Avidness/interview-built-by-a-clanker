import { test, expect, type Page } from "@playwright/test";
import { API_URL, PERSONAS, TOTAL_PERSONAS, loginAs, personaCards } from "./helpers";

const OUTAGE = "Simulated upstream outage";

/** Make `path` on the API fail with a 500 carrying `OUTAGE` as its error message. */
async function failWith500(page: Page, path: string) {
  await page.route(`${API_URL}${path}`, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: OUTAGE }),
    }),
  );
}

test.describe("Error states (GAPS 2.3)", () => {
  test("browse shows the API error and recovers on retry", async ({ page }) => {
    await failWith500(page, "/personas");
    await page.goto("/");

    await expect(page.getByRole("alert")).toContainText(OUTAGE);
    await expect(page.getByText("No personas found matching your criteria.")).toHaveCount(0);

    await page.unroute(`${API_URL}/personas`);
    await page.getByRole("button", { name: "Try again" }).click();

    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(personaCards(page)).toHaveCount(TOTAL_PERSONAS);
  });

  test("cart shows the API error instead of an empty cart", async ({ page, request }) => {
    await loginAs(page, request);
    await failWith500(page, "/cart");
    await page.goto("/cart");

    await expect(page.getByRole("main").getByRole("alert")).toContainText(OUTAGE);
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("favorites shows the API error instead of an empty list", async ({ page, request }) => {
    await loginAs(page, request);
    await failWith500(page, "/favorites");
    await page.goto("/favorites");

    await expect(page.getByRole("alert")).toContainText(OUTAGE);
    await expect(page.getByText("You haven't favorited any personas yet.")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("persona detail shows the API error instead of not-found", async ({ page }) => {
    await failWith500(page, `/personas/${PERSONAS.rex.id}`);
    await page.goto(`/personas/${PERSONAS.rex.id}`);

    await expect(page.getByRole("alert")).toContainText(OUTAGE);
    await expect(page.getByRole("heading", { name: "Persona not found" })).toHaveCount(0);

    await page.unroute(`${API_URL}/personas/${PERSONAS.rex.id}`);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: PERSONAS.rex.name })).toBeVisible();
  });

  test("persona detail still shows not-found for a 404", async ({ page }) => {
    await page.goto("/personas/does-not-exist");
    await expect(page.getByRole("heading", { name: "Persona not found" })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
