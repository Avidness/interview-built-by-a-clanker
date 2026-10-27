import type { FastifyInstance } from "fastify";
import type { Cart, Order } from "@acme/shared";
import { createTestApp, registerUser, authed, type TestUser } from "./helpers.js";

let app: FastifyInstance;
let user: TestUser;
beforeAll(async () => {
  app = await createTestApp();
  user = await registerUser(app);
});
afterAll(() => app.close());

const customer = { name: "Alice Example", email: "alice@example.com" };

describe("POST /checkout", () => {
  it("requires authentication", async () => {
    expect((await app.inject({ method: "POST", url: "/checkout", payload: customer })).statusCode).toBe(401);
  });

  it("rejects an empty cart with 400", async () => {
    const res = await app.inject(authed(user, { method: "POST", url: "/checkout", payload: customer }));
    expect(res.statusCode).toBe(400);
  });

  it("validates customer details with 400", async () => {
    await app.inject(authed(user, { method: "POST", url: "/cart", payload: { personaId: "p-001" } }));
    const res = await app.inject(authed(user, { method: "POST", url: "/checkout", payload: { name: "", email: "bad" } }));
    expect(res.statusCode).toBe(400);
  });

  it("creates an order that snapshots the cart, then empties the cart", async () => {
    await app.inject(authed(user, { method: "POST", url: "/cart", payload: { personaId: "p-002", quantity: 2 } }));
    const before = (await app.inject(authed(user, { method: "GET", url: "/cart" }))).json<Cart>();
    expect(before.items).toHaveLength(2);

    const res = await app.inject(authed(user, { method: "POST", url: "/checkout", payload: customer }));
    expect(res.statusCode).toBe(201);
    const order = res.json<Order>();
    expect(order).toMatchObject({
      id: expect.any(String),
      userId: user.user.id,
      customerName: customer.name,
      customerEmail: customer.email,
      createdAt: expect.any(String),
    });
    expect(order.items.map((i) => [i.personaId, i.quantity])).toEqual(before.items.map((i) => [i.personaId, i.quantity]));
    const expectedTotal = before.items.reduce((sum, i) => sum + i.persona.price * i.quantity, 0);
    expect(order.total).toBeCloseTo(expectedTotal, 2);
    expect(order.total).toBeCloseTo(before.total, 2);

    const after = (await app.inject(authed(user, { method: "GET", url: "/cart" }))).json<Cart>();
    expect(after).toEqual({ items: [], total: 0 });

    const again = await app.inject(authed(user, { method: "POST", url: "/checkout", payload: customer }));
    expect(again.statusCode).toBe(400);
  });

  it("gives each order a unique id", async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 2; i++) {
      await app.inject(authed(user, { method: "POST", url: "/cart", payload: { personaId: "p-001" } }));
      const res = await app.inject(authed(user, { method: "POST", url: "/checkout", payload: customer }));
      expect(res.statusCode).toBe(201);
      ids.add(res.json<Order>().id);
    }
    expect(ids.size).toBe(2);
  });
});
