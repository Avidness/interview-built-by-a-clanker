import { test, expect } from "@playwright/test";
import {
  PERSONAS,
  addFavoriteViaApi,
  favoriteHeart,
  favoriteToggle,
  loginAs,
  personaCard,
  personaCards,
} from "./helpers";

test.describe("Favorites", () => {
  test("shows an empty state for a new user", async ({ page, request }) => {
    await loginAs(page, request);
    await page.getByRole("navigation").getByRole("link", { name: "Favorites" }).click();
    await expect(page).toHaveURL("/favorites");
    await expect(page.getByRole("heading", { name: "Your Favorites" })).toBeVisible();
    await expect(page.getByText("You haven't favorited any personas yet.")).toBeVisible();
  });

  test("favorites a persona from its detail page", async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto(`/personas/${PERSONAS.rex.id}`);

    await expect(favoriteHeart(page)).toHaveAttribute("fill", "none");
    await favoriteToggle(page).click();
    await expect(favoriteHeart(page)).toHaveAttribute("fill", "currentColor");

    await page.goto("/favorites");
    await expect(personaCards(page)).toHaveCount(1);
    await expect(personaCard(page, PERSONAS.rex.name)).toBeVisible();
  });

  test("shows a persona as favorited when revisiting its detail page", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addFavoriteViaApi(request, token, PERSONAS.rex.id);

    await page.goto(`/personas/${PERSONAS.rex.id}`);
    await expect(favoriteHeart(page)).toHaveAttribute("fill", "currentColor");
  });

  test("un-favorites a persona from its detail page", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addFavoriteViaApi(request, token, PERSONAS.rex.id);

    await page.goto(`/personas/${PERSONAS.rex.id}`);
    await expect(favoriteHeart(page)).toHaveAttribute("fill", "currentColor");
    await favoriteToggle(page).click();
    await expect(favoriteHeart(page)).toHaveAttribute("fill", "none");

    await page.goto("/favorites");
    await expect(page.getByText("You haven't favorited any personas yet.")).toBeVisible();
  });

  test("removes a favorite from the favorites page", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addFavoriteViaApi(request, token, PERSONAS.rex.id);
    await addFavoriteViaApi(request, token, PERSONAS.zara.id);

    await page.goto("/favorites");
    await expect(personaCards(page)).toHaveCount(2);

    await personaCard(page, PERSONAS.rex.name)
      .locator("..")
      .getByRole("button", { name: "Remove from favorites" })
      .click();

    await expect(personaCards(page)).toHaveCount(1);
    await expect(personaCard(page, PERSONAS.zara.name)).toBeVisible();
    await expect(personaCard(page, PERSONAS.rex.name)).toHaveCount(0);
  });

  test("favorites are private to each user", async ({ page, request }) => {
    const other = await loginAs(page, request);
    await addFavoriteViaApi(request, other.token, PERSONAS.zara.id);

    await page.evaluate(() => localStorage.removeItem("auth_token"));
    await loginAs(page, request);
    await page.goto("/favorites");
    await expect(page.getByText("You haven't favorited any personas yet.")).toBeVisible();
  });
});
