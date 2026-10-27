import type { FastifyInstance } from "fastify";
import type { Order } from "@acme/shared";
import { createTestApp, registerUser, authed, type TestUser } from "./helpers.js";

let app: FastifyInstance;
let user: TestUser;
beforeAll(async () => {
  app = await createTestApp();
  user = await registerUser(app);
});
afterAll(() => app.close());

const customer = { name: "Alice Example", email: "alice@example.com" };

const list = async (u: TestUser = user) =>
  (await app.inject(authed(u, { method: "GET", url: "/orders" }))).json<{ orders: Order[] }>().orders;

async function placeOrder(u: TestUser, personaId: string, quantity = 1): Promise<Order> {
  await app.inject(authed(u, { method: "POST", url: "/cart", payload: { personaId, quantity } }));
  const res = await app.inject(authed(u, { method: "POST", url: "/checkout", payload: customer }));
  expect(res.statusCode).toBe(201);
  return res.json<Order>();
}

describe("GET /orders", () => {
  it("requires authentication", async () => {
    expect((await app.inject({ method: "GET", url: "/orders" })).statusCode).toBe(401);
  });

  it("returns an empty list for a user with no orders", async () => {
    const res = await app.inject(authed(user, { method: "GET", url: "/orders" }));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ orders: [] });
  });

  it("lists every order the user has placed, with items and totals", async () => {
    const first = await placeOrder(user, "p-001", 2);
    const second = await placeOrder(user, "p-002");

    const orders = await list();
    expect(orders.map((o) => o.id)).toEqual([first.id, second.id]);
    expect(orders[0]).toMatchObject({
      id: first.id,
      userId: user.user.id,
      total: first.total,
      customerEmail: customer.email,
      createdAt: first.createdAt,
    });
    expect(orders[0].items).toHaveLength(1);
    expect(orders[0].items[0]).toMatchObject({
      personaId: "p-001",
      quantity: 2,
      persona: { name: "Refactor Rex" },
    });
  });

  it("only returns the caller's own orders", async () => {
    const other = await registerUser(app);
    expect(await list(other)).toEqual([]);
    const mine = await placeOrder(other, "p-003");
    expect((await list(other)).map((o) => o.id)).toEqual([mine.id]);
    expect((await list()).some((o) => o.id === mine.id)).toBe(false);
  });
});
