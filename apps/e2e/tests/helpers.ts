import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3101";

/** Seed personas the API ships with (apps/api/src/db.ts). */
export const PERSONAS = {
  rex: { id: "p-001", name: "Refactor Rex", price: 49.99, tier: "Pro", specialty: "Engineering" },
  zara: { id: "p-002", name: "Zero-Day Zara", price: 89.99, tier: "Enterprise", specialty: "Security" },
  olivia: { id: "p-012", name: "Onboard Olivia", price: 34.99, tier: "Starter", specialty: "Product" },
  tina: { id: "p-008", name: "Terraform Tina", price: 79.99, tier: "Enterprise", specialty: "DevOps" },
  carl: { id: "p-011", name: "Compliance Carl", price: 99.99, tier: "Enterprise", specialty: "Security" },
} as const;

export const TOTAL_PERSONAS = 15;

export interface Credentials {
  username: string;
  email: string;
  password: string;
}

export interface Session {
  token: string;
  creds: Credentials;
  userId: string;
}

export function uniqueUser(): Credentials {
  const n = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    username: `user_${n}`,
    email: `${n}@example.com`,
    password: "password123",
  };
}

export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/** Register a brand-new user straight against the API and return its token. */
export async function registerViaApi(
  request: APIRequestContext,
  creds: Credentials = uniqueUser(),
): Promise<Session> {
  const res = await request.post(`${API_URL}/auth/register`, { data: creds });
  expect(res.status(), "register should return 201").toBe(201);
  const body = (await res.json()) as { token: string; user: { id: string } };
  return { token: body.token, creds, userId: body.user.id };
}

/**
 * Register a fresh unique user via the API and leave `page` on "/" logged in
 * as that user (token in localStorage, nav showing the username).
 */
export async function loginAs(
  page: Page,
  request: APIRequestContext,
  creds: Credentials = uniqueUser(),
): Promise<Session> {
  const session = await registerViaApi(request, creds);
  await page.goto("/");
  await page.evaluate((token) => localStorage.setItem("auth_token", token), session.token);
  await page.reload();
  await expect(page.getByRole("navigation").getByText(session.creds.username)).toBeVisible();
  return session;
}

/** Register a fresh user through the UI form. Resolves once the form was submitted. */
export async function registerViaUi(page: Page, creds: Credentials = uniqueUser()) {
  await page.goto("/register");
  await page.getByLabel("Username").fill(creds.username);
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Create Account" }).click();
  return creds;
}

export async function loginViaUi(page: Page, creds: Credentials) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

export async function addToCartViaApi(
  request: APIRequestContext,
  token: string,
  personaId: string,
  quantity = 1,
) {
  const res = await request.post(`${API_URL}/cart`, {
    headers: authHeaders(token),
    data: { personaId, quantity },
  });
  expect(res.ok(), `POST /cart should succeed (got ${res.status()})`).toBeTruthy();
}

export async function addFavoriteViaApi(
  request: APIRequestContext,
  token: string,
  personaId: string,
) {
  const res = await request.post(`${API_URL}/favorites`, {
    headers: authHeaders(token),
    data: { personaId },
  });
  expect(res.ok(), `POST /favorites should succeed (got ${res.status()})`).toBeTruthy();
}

/** All persona cards rendered in the browse / favorites grids. */
export function personaCards(page: Page) {
  return page.getByRole("main").locator('a[href^="/personas/"]');
}

export function personaCard(page: Page, name: string) {
  return page.getByRole("main").getByRole("link", { name: new RegExp(name) });
}

/** The cart icon link in the top nav (its badge text is the item count). */
export function cartNavLink(page: Page) {
  return page.getByRole("navigation").locator('a[href="/cart"]');
}

/**
 * The heart toggle on the persona detail page. It has no accessible name,
 * so we anchor on its sibling "Add to Cart" button.
 */
export function favoriteToggle(page: Page) {
  return page
    .getByRole("button", { name: "Add to Cart" })
    .locator("xpath=following-sibling::button[1]");
}

/** The <svg> inside the favorite toggle; filled red when favorited. */
export function favoriteHeart(page: Page) {
  return favoriteToggle(page).locator("svg");
}
