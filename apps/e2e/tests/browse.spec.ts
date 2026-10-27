import { test, expect } from "@playwright/test";
import {
  API_URL,
  PERSONAS,
  TOTAL_PERSONAS,
  money,
  personaCard,
  personaCards,
} from "./helpers";

test.describe("Browse personas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Discover Agentic Personas" }),
    ).toBeVisible();
  });

  test("lists every seeded persona with name, tier and price", async ({ page }) => {
    await expect(personaCards(page)).toHaveCount(TOTAL_PERSONAS);

    const rex = personaCard(page, PERSONAS.rex.name);
    await expect(rex).toBeVisible();
    await expect(rex.getByText(PERSONAS.rex.tier, { exact: true })).toBeVisible();
    await expect(rex.getByText(money(PERSONAS.rex.price))).toBeVisible();
  });

  test("filters by specialty", async ({ page }) => {
    await page.getByRole("button", { name: "Security", exact: true }).click();
    await expect(page).toHaveURL(/specialty=Security/);

    await expect(personaCards(page)).toHaveCount(2);
    await expect(personaCard(page, PERSONAS.zara.name)).toBeVisible();
    await expect(personaCard(page, PERSONAS.carl.name)).toBeVisible();
    await expect(personaCard(page, PERSONAS.rex.name)).toHaveCount(0);
  });

  test("filters by tier", async ({ page }) => {
    await page.getByRole("button", { name: "Starter", exact: true }).click();
    await expect(page).toHaveURL(/tier=Starter/);

    await expect(personaCards(page)).toHaveCount(4);
    for (const card of await personaCards(page).all()) {
      await expect(card.getByText("Starter", { exact: true })).toBeVisible();
    }
  });

  test("clearing an active filter restores the full list", async ({ page }) => {
    const security = page.getByRole("button", { name: "Security", exact: true });
    await security.click();
    await expect(personaCards(page)).toHaveCount(2);
    await security.click();
    await expect(page).not.toHaveURL(/specialty=/);
    await expect(personaCards(page)).toHaveCount(TOTAL_PERSONAS);
  });

  test("searches by keyword", async ({ page }) => {
    await page.getByPlaceholder(/Search personas/).fill("terraform");
    await expect(page).toHaveURL(/q=terraform/);

    await expect(personaCards(page)).toHaveCount(1);
    await expect(personaCard(page, PERSONAS.tina.name)).toBeVisible();
  });

  test("shows an empty state for a search with no matches", async ({ page }) => {
    await page.getByPlaceholder(/Search personas/).fill("zzzz-no-such-persona");
    await expect(page).toHaveURL(/q=zzzz/);

    await expect(page.getByText("No personas found matching your criteria.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(personaCards(page)).toHaveCount(TOTAL_PERSONAS);
  });

  test("sorts by price low to high", async ({ page }) => {
    await page.getByRole("combobox").selectOption({ label: "Price: Low to High" });
    await expect(page).toHaveURL(/sort=price-asc/);

    await expect(personaCards(page).first()).toContainText(PERSONAS.olivia.name);
    await expect(personaCards(page).last()).toContainText(PERSONAS.carl.name);
  });

  test("sorts by name A-Z", async ({ page }) => {
    await page.getByRole("combobox").selectOption({ label: "Name: A-Z" });
    await expect(page).toHaveURL(/sort=name-asc/);

    await expect(personaCards(page).first()).toContainText("A11y Alex");
  });

  test("applies filters from the URL on a fresh load", async ({ page }) => {
    await page.goto("/?tier=Enterprise&sort=price-desc");
    await expect(personaCards(page)).toHaveCount(4);
    await expect(personaCards(page).first()).toContainText(PERSONAS.carl.name);
  });

  test("opens the persona detail page from a card", async ({ page }) => {
    await personaCard(page, PERSONAS.rex.name).click();
    await expect(page).toHaveURL(`/personas/${PERSONAS.rex.id}`);

    await expect(page.getByRole("heading", { level: 1, name: PERSONAS.rex.name })).toBeVisible();
    await expect(page.getByText(money(PERSONAS.rex.price))).toBeVisible();
    await expect(page.getByText("per month")).toBeVisible();
    await expect(page.getByText("Code review", { exact: true })).toBeVisible();
    await expect(page.getByText("(234 reviews)")).toBeVisible();
  });

  test("detail page asks guests to sign in instead of showing cart actions", async ({ page }) => {
    await page.goto(`/personas/${PERSONAS.rex.id}`);
    await expect(page.getByRole("heading", { level: 1, name: PERSONAS.rex.name })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to Cart" })).toHaveCount(0);
    await expect(page.getByText("to add to cart or save as favorite.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("shows a not-found state for an unknown persona", async ({ page }) => {
    await page.goto("/personas/does-not-exist");
    await expect(page.getByRole("heading", { name: "Persona not found" })).toBeVisible();
    await page.getByRole("link", { name: "Back to browse" }).click();
    await expect(page).toHaveURL("/");
  });

  test("search debounce is not reset by an unrelated re-render (GAPS 2.6)", async ({ page }) => {
    // Hold the personas response so it can be released while the 300 ms
    // debounce is pending. The data arriving re-renders BrowsePage; a stable
    // onChange keeps the timer running, an unstable one restarts it.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(`${API_URL}/personas`, async (route) => {
      await gate;
      await route.continue();
    });

    await page.goto("/");
    const input = page.getByPlaceholder(/Search personas/);
    await expect(input).toBeVisible();

    const started = Date.now();
    await input.fill("rex");
    await page.waitForTimeout(200);
    release();

    await page.waitForURL(/q=rex/);
    const elapsed = Date.now() - started;
    // ~300 ms when the debounce is stable; >= 500 ms if the re-render at
    // 200 ms restarted it.
    expect(elapsed, `URL updated after ${elapsed} ms`).toBeLessThan(450);
  });
});
