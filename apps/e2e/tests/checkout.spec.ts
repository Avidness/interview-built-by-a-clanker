import { test, expect } from "@playwright/test";
import { PERSONAS, addToCartViaApi, cartNavLink, loginAs, money } from "./helpers";

test.describe("Checkout", () => {
  test("shows nothing to checkout for an empty cart", async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Nothing to checkout" })).toBeVisible();
  });

  test("navigates from the cart to checkout with the right summary", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 2);

    await page.goto("/cart");
    await page.getByRole("button", { name: "Proceed to Checkout" }).click();
    await expect(page).toHaveURL("/checkout");
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText(PERSONAS.rex.name)).toBeVisible();
    await expect(page.getByText("x2")).toBeVisible();
    await expect(page.getByText("Total").locator("..")).toContainText(money(PERSONAS.rex.price * 2));
  });

  test("places an order and shows a confirmation", async ({ page, request }) => {
    const { token, creds } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 1);
    await addToCartViaApi(request, token, PERSONAS.zara.id, 1);

    await page.goto("/checkout");
    await page.getByLabel("Full Name").fill("Jane Doe");
    await page.getByLabel("Email").fill(creds.email);
    await page.getByRole("button", { name: "Place Order" }).click();

    await expect(page.getByRole("heading", { name: "Order Confirmed!" })).toBeVisible();
    await expect(page.getByText(/Order ID:/)).toContainText(/order-\d+/);
    const expected = PERSONAS.rex.price + PERSONAS.zara.price;
    await expect(page.getByText(/^Total:/)).toContainText(money(expected));
    await expect(page.getByText(creds.email)).toBeVisible();
  });

  test("empties the cart after a successful order", async ({ page, request }) => {
    const { token, creds } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 1);

    await page.goto("/checkout");
    await page.getByLabel("Full Name").fill("Jane Doe");
    await page.getByLabel("Email").fill(creds.email);
    await page.getByRole("button", { name: "Place Order" }).click();
    await expect(page.getByRole("heading", { name: "Order Confirmed!" })).toBeVisible();

    await page.getByRole("link", { name: "Continue Shopping" }).click();
    await expect(page).toHaveURL("/");
    await expect(cartNavLink(page)).toHaveText("");

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  });

  test("requires name and email before placing an order", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 1);

    await page.goto("/checkout");
    await page.getByRole("button", { name: "Place Order" }).click();

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Order Confirmed!" })).toHaveCount(0);
    await expect(page.getByLabel("Full Name")).toBeFocused();
  });
});
