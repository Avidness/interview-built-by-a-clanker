import { test, expect, type APIRequestContext } from "@playwright/test";
import { API_URL, PERSONAS, addToCartViaApi, authHeaders, loginAs, money } from "./helpers";

interface PlacedOrder {
  id: string;
  total: number;
}

/** Checks out whatever is in the user's cart straight against the API. */
async function placeOrderViaApi(request: APIRequestContext, token: string): Promise<PlacedOrder> {
  const res = await request.post(`${API_URL}/checkout`, {
    headers: authHeaders(token),
    data: { name: "Jane Doe", email: "jane@example.com" },
  });
  expect(res.status(), `POST /checkout should return 201 (got ${res.status()})`).toBe(201);
  return (await res.json()) as PlacedOrder;
}

test.describe("Order history", () => {
  test("asks guests to sign in", async ({ page }) => {
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "Sign in to view your orders" })).toBeVisible();
  });

  test("shows an empty state for a user with no orders", async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "Your Orders" })).toBeVisible();
    await expect(page.getByText("You haven't placed any orders yet.")).toBeVisible();
  });

  test("lists placed orders with id, date, total and items", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 2);
    await addToCartViaApi(request, token, PERSONAS.zara.id, 1);
    const order = await placeOrderViaApi(request, token);

    await page.goto("/orders");
    const row = page.getByRole("listitem").filter({ hasText: order.id });
    await expect(row).toBeVisible();
    await expect(row).toContainText(money(PERSONAS.rex.price * 2 + PERSONAS.zara.price));
    await expect(row).toContainText(`${PERSONAS.rex.name} x2`);
    await expect(row).toContainText(`${PERSONAS.zara.name} x1`);
    await expect(row.getByText(String(new Date().getFullYear()))).toBeVisible();
  });

  test("survives a reload when reached from the checkout confirmation", async ({ page, request }) => {
    const { token, creds } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 1);

    await page.goto("/checkout");
    await page.getByLabel("Full Name").fill("Jane Doe");
    await page.getByLabel("Email").fill(creds.email);
    await page.getByRole("button", { name: "Place Order" }).click();
    await expect(page.getByRole("heading", { name: "Order Confirmed!" })).toBeVisible();
    const orderId = (await page.getByText(/Order ID:/).textContent())?.match(/order-\d+/)?.[0];
    expect(orderId).toBeTruthy();

    await page.getByRole("link", { name: "View your orders" }).click();
    await expect(page).toHaveURL("/orders");
    await expect(page.getByRole("listitem").filter({ hasText: orderId! })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: orderId! })).toBeVisible();
  });

  test("is reachable from the cart page", async ({ page, request }) => {
    const { token } = await loginAs(page, request);
    await addToCartViaApi(request, token, PERSONAS.rex.id, 1);
    await page.goto("/cart");
    await page.getByRole("main").getByRole("link", { name: "Orders" }).click();
    await expect(page).toHaveURL("/orders");
  });

  test("orders are private to each user", async ({ page, request }) => {
    const other = await loginAs(page, request);
    await addToCartViaApi(request, other.token, PERSONAS.zara.id, 1);
    const theirs = await placeOrderViaApi(request, other.token);

    await page.evaluate(() => localStorage.removeItem("auth_token"));
    await loginAs(page, request);
    await page.goto("/orders");
    await expect(page.getByText("You haven't placed any orders yet.")).toBeVisible();
    await expect(page.getByText(theirs.id)).toHaveCount(0);
  });
});
