import { test, expect } from "@playwright/test";
import { PERSONAS, addFavoriteViaApi, loginAs, personaCard, personaCards } from "./helpers";

test.describe("Favorite indicator on cards", () => {
  test("every card on the favorites page shows a filled heart", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addFavoriteViaApi(request, token, PERSONAS.rex.id);
    await addFavoriteViaApi(request, token, PERSONAS.zara.id);

    await page.goto("/favorites");
    await expect(personaCards(page)).toHaveCount(2);
    await expect(personaCard(page, PERSONAS.rex.name).getByRole("img", { name: "Favorited" })).toBeVisible();
    await expect(personaCard(page, PERSONAS.zara.name).getByRole("img", { name: "Favorited" })).toBeVisible();
  });

  test("browse cards show no indicator", async ({ page }) => {
    await page.goto("/");
    await expect(personaCard(page, PERSONAS.rex.name)).toBeVisible();
    await expect(page.getByRole("img", { name: "Favorited" })).toHaveCount(0);
  });
});
