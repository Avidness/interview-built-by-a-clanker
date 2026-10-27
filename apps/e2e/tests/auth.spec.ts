import { test, expect } from "@playwright/test";
import { loginAs, loginViaUi, registerViaApi, registerViaUi } from "./helpers";

test.describe("Authentication", () => {
  test("registers a new account and lands on browse signed in", async ({ page }) => {
    const creds = await registerViaUi(page);

    await expect(page).toHaveURL("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByText(creds.username)).toBeVisible();
    await expect(nav.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Favorites" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  });

  test("rejects registering with an email that is already taken", async ({ page, request }) => {
    const { creds } = await registerViaApi(request);
    await registerViaUi(page, { ...creds, username: `${creds.username}_dup` });

    await expect(page.getByText("Email already registered")).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("logs in with an existing account and shows the username", async ({ page, request }) => {
    const { creds } = await registerViaApi(request);
    await loginViaUi(page, creds);

    await expect(page).toHaveURL("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(nav.getByText(creds.username)).toBeVisible();
  });

  test("shows an error for a wrong password", async ({ page, request }) => {
    const { creds } = await registerViaApi(request);
    await loginViaUi(page, { ...creds, password: "wrong-password" });

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("keeps the session after a page reload", async ({ page, request }) => {
    const { creds } = await registerViaApi(request);
    await loginViaUi(page, creds);
    await expect(page.getByRole("navigation").getByText(creds.username)).toBeVisible();

    await page.reload();
    const nav = page.getByRole("navigation");
    await expect(nav.getByText(creds.username)).toBeVisible();
    await expect(nav.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("signing out returns to a guest nav", async ({ page, request }) => {
    const { creds } = await loginAs(page, request);

    await page.getByRole("button", { name: "Sign out" }).click();
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(nav.getByText(creds.username)).toHaveCount(0);
  });

  test("stays signed out after sign out and reload", async ({ page, request }) => {
    const { creds } = await loginAs(page, request);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Sign in" })).toBeVisible();

    await page.reload();
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(nav.getByText(creds.username)).toHaveCount(0);
    await expect(nav.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  });

  test("protected pages prompt guests to sign in", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Sign in to view your cart" })).toBeVisible();
    await page.goto("/favorites");
    await expect(page.getByRole("heading", { name: "Sign in to view favorites" })).toBeVisible();
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Sign in to checkout" })).toBeVisible();
  });

  test("login form links to registration and back", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("main").getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL("/register");
    await page.getByRole("main").getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
  });
});
