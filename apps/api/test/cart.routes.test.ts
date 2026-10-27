import type { FastifyInstance } from "fastify";
import type { Cart } from "@acme/shared";
import { createTestApp, registerUser, authed, type TestUser } from "./helpers.js";

let app: FastifyInstance;
let user: TestUser;
beforeAll(async () => {
  app = await createTestApp();
  user = await registerUser(app);
});
afterAll(() => app.close());

const getCart = async (u: TestUser = user) =>
  (await app.inject(authed(u, { method: "GET", url: "/cart" }))).json<Cart>();

describe("cart routes", () => {
  it("require authentication", async () => {
    for (const [method, url] of [
      ["GET", "/cart"],
      ["POST", "/cart"],
      ["PUT", "/cart/x"],
      ["DELETE", "/cart/x"],
    ] as const) {
      const res = await app.inject({ method, url, payload: method === "GET" || method === "DELETE" ? undefined : {} });
      expect(`${method} ${url} -> ${res.statusCode}`).toBe(`${method} ${url} -> 401`);
    }
  });

  it("starts empty", async () => {
    expect(await getCart()).toEqual({ items: [], total: 0 });
  });

  it("adds a persona and returns the enriched cart with a correct total", async () => {
    const res = await app.inject(
      authed(user, { method: "POST", url: "/cart", payload: { personaId: "p-001", quantity: 2 } }),
    );
    expect(res.statusCode).toBe(200);
    const cart = res.json<Cart>();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ personaId: "p-001", quantity: 2, persona: { id: "p-001" } });
    expect(cart.total).toBeCloseTo(cart.items[0].persona.price * 2, 2);
  });

  it("merges a repeated add into the existing line", async () => {
    await app.inject(authed(user, { method: "POST", url: "/cart", payload: { personaId: "p-001" } }));
    const cart = await getCart();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  it("404s when adding an unknown persona and 400s on a bad quantity", async () => {
    const missing = await app.inject(authed(user, { method: "POST", url: "/cart", payload: { personaId: "nope" } }));
    expect(missing.statusCode).toBe(404);
    const bad = await app.inject(
      authed(user, { method: "POST", url: "/cart", payload: { personaId: "p-001", quantity: 0 } }),
    );
    expect(bad.statusCode).toBe(400);
  });

  it("updates a line's quantity and recomputes the total", async () => {
    const { items } = await getCart();
    const res = await app.inject(
      authed(user, { method: "PUT", url: `/cart/${items[0].id}`, payload: { quantity: 1 } }),
    );
    expect(res.statusCode).toBe(200);
    const cart = res.json<Cart>();
    expect(cart.items[0].quantity).toBe(1);
    expect(cart.total).toBeCloseTo(cart.items[0].persona.price, 2);
  });

  it("removes a line", async () => {
    const { items } = await getCart();
    const res = await app.inject(authed(user, { method: "DELETE", url: `/cart/${items[0].id}` }));
    expect(res.statusCode).toBe(200);
    expect(res.json<Cart>().items).toHaveLength(0);
  });

  it("keeps carts isolated between users", async () => {
    const other = await registerUser(app);
    await app.inject(authed(user, { method: "POST", url: "/cart", payload: { personaId: "p-002" } }));
    expect((await getCart(other)).items).toHaveLength(0);

    const { items } = await getCart();
    const stolenUpdate = await app.inject(
      authed(other, { method: "PUT", url: `/cart/${items[0].id}`, payload: { quantity: 9 } }),
    );
    expect(stolenUpdate.statusCode).toBe(404);
    const stolenDelete = await app.inject(authed(other, { method: "DELETE", url: `/cart/${items[0].id}` }));
    expect(stolenDelete.statusCode).toBe(404);
    expect((await getCart()).items).toHaveLength(1);
  });

  it("allows the browser to preflight DELETE from the web origin", async () => {
    const res = await app.inject({
      method: "OPTIONS",
      url: "/cart/some-id",
      headers: { origin: "http://localhost:5173", "access-control-request-method": "DELETE" },
    });
    expect(res.statusCode).toBeLessThan(400);
    expect(res.headers["access-control-allow-methods"]).toMatch(/DELETE/);
  });
});
