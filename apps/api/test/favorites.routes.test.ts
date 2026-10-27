import type { FastifyInstance } from "fastify";
import type { Persona } from "@acme/shared";
import { createTestApp, registerUser, authed, type TestUser } from "./helpers.js";

let app: FastifyInstance;
let user: TestUser;
beforeAll(async () => {
  app = await createTestApp();
  user = await registerUser(app);
});
afterAll(() => app.close());

const list = async (u: TestUser = user) =>
  (await app.inject(authed(u, { method: "GET", url: "/favorites" }))).json<{ favorites: Persona[] }>().favorites;

describe("favorites routes", () => {
  it("require authentication", async () => {
    expect((await app.inject({ method: "GET", url: "/favorites" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/favorites", payload: { personaId: "p-001" } })).statusCode).toBe(
      401,
    );
  });

  it("start empty, then add and list full persona objects", async () => {
    expect(await list()).toEqual([]);
    const res = await app.inject(authed(user, { method: "POST", url: "/favorites", payload: { personaId: "p-003" } }));
    expect(res.statusCode).toBe(200);
    const favs = await list();
    expect(favs).toHaveLength(1);
    expect(favs[0]).toMatchObject({ id: "p-003", name: expect.any(String) });
  });

  it("adding the same persona twice does not duplicate it", async () => {
    await app.inject(authed(user, { method: "POST", url: "/favorites", payload: { personaId: "p-003" } }));
    expect(await list()).toHaveLength(1);
  });

  it("validates the persona", async () => {
    expect((await app.inject(authed(user, { method: "POST", url: "/favorites", payload: {} }))).statusCode).toBe(400);
    expect(
      (await app.inject(authed(user, { method: "POST", url: "/favorites", payload: { personaId: "nope" } })))
        .statusCode,
    ).toBe(404);
  });

  it("removes a favorite and 404s on a second removal", async () => {
    expect((await app.inject(authed(user, { method: "DELETE", url: "/favorites/p-003" }))).statusCode).toBe(200);
    expect(await list()).toEqual([]);
    expect((await app.inject(authed(user, { method: "DELETE", url: "/favorites/p-003" }))).statusCode).toBe(404);
  });

  it("are per user", async () => {
    const other = await registerUser(app);
    await app.inject(authed(user, { method: "POST", url: "/favorites", payload: { personaId: "p-004" } }));
    expect(await list(other)).toEqual([]);
  });
});
