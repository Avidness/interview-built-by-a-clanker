import { test, expect } from "@playwright/test";
import { PERSONAS, addToCartViaApi, cartNavLink, loginAs, money } from "./helpers";

test.describe("Cart", () => {
  test("shows an empty state for a new user", async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    await expect(cartNavLink(page)).toHaveText("");
  });

  test("adds a persona to the cart from its detail page", async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto(`/personas/${PERSONAS.rex.id}`);
    await page.getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByRole("button", { name: "Add to Cart" })).toBeEnabled();

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();
    const row = page.getByRole("main").getByText(PERSONAS.rex.name, { exact: true }).first();
    await expect(row).toBeVisible();
    await expect(page.getByText("Total").locator("..")).toContainText(money(PERSONAS.rex.price));
  });

  test("updates the nav cart badge after adding to cart", async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto(`/personas/${PERSONAS.rex.id}`);
    await page.getByRole("button", { name: "Add to Cart" }).click();

    await expect(cartNavLink(page)).toHaveText("1");
  });

  test("adding the same persona twice increases its quantity", async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto(`/personas/${PERSONAS.rex.id}`);
    const add = page.getByRole("button", { name: "Add to Cart" });
    await add.click();
    await expect(add).toBeEnabled();
    await add.click();
    await expect(add).toBeEnabled();

    await page.goto("/cart");
    await expect(page.getByText(`${PERSONAS.rex.name} x2`)).toBeVisible();
    await expect(page.getByText("Total").locator("..")).toContainText(money(PERSONAS.rex.price * 2));
  });

  test("increments quantity with the + button", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 1);

    await page.goto("/cart");
    await page.getByRole("button", { name: "+", exact: true }).click();

    await expect(page.getByText(`${PERSONAS.rex.name} x2`)).toBeVisible();
    await expect(page.getByText("Total").locator("..")).toContainText(money(PERSONAS.rex.price * 2));
  });

  test("decrements quantity with the - button", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 2);

    await page.goto("/cart");
    await expect(page.getByText(`${PERSONAS.rex.name} x2`)).toBeVisible();
    await page.getByRole("button", { name: "-", exact: true }).click();

    await expect(page.getByText(`${PERSONAS.rex.name} x1`)).toBeVisible();
    await expect(page.getByText("Total").locator("..")).toContainText(money(PERSONAS.rex.price));
  });

  test("cannot decrement below a quantity of one", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 1);

    await page.goto("/cart");
    await expect(page.getByText(`${PERSONAS.rex.name} x1`)).toBeVisible();
    await expect(page.getByRole("button", { name: "-", exact: true })).toBeDisabled();
  });

  test("removes an item from the cart", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 1);

    await page.goto("/cart");
    await page.getByRole("button", { name: "Remove", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  });

  test("totals multiple line items correctly", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 2);
    await addToCartViaApi(request, token, PERSONAS.zara.id, 1);

    await page.goto("/cart");
    const expected = PERSONAS.rex.price * 2 + PERSONAS.zara.price;
    await expect(page.getByText("Total").locator("..")).toContainText(money(expected));
    await expect(cartNavLink(page)).toHaveText("3");
  });

  test("a user cannot see another user's cart items", async ({ page, request }) => {
    const other = await loginAs(page, request);
    await addToCartViaApi(request, other.token, PERSONAS.zara.id, 1);

    await page.evaluate(() => localStorage.removeItem("auth_token"));
    await loginAs(page, request);
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  });
});
