import type { FastifyInstance } from "fastify";
import type { Persona } from "@acme/shared";
import { createTestApp } from "./helpers.js";

let app: FastifyInstance;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(() => app.close());

describe("GET /personas", () => {
  it("lists all personas publicly", async () => {
    const res = await app.inject({ method: "GET", url: "/personas" });
    expect(res.statusCode).toBe(200);
    const body = res.json<Persona[]>();
    expect(body.length).toBeGreaterThanOrEqual(10);
    expect(body[0]).toMatchObject({ id: expect.any(String), name: expect.any(String), price: expect.any(Number) });
  });

  it("applies specialty, tier and sort from the query string", async () => {
    const res = await app.inject({ method: "GET", url: "/personas?specialty=Engineering&sort=price-asc" });
    const body = res.json<Persona[]>();
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((p) => p.specialty === "Engineering")).toBe(true);
    for (let i = 1; i < body.length; i++) expect(body[i - 1].price).toBeLessThanOrEqual(body[i].price);
  });

  it("treats minPrice as a lower bound", async () => {
    const res = await app.inject({ method: "GET", url: "/personas?minPrice=60" });
    const body = res.json<Persona[]>();
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((p) => p.price >= 60)).toBe(true);
  });

  it("returns an empty list, not an error, when nothing matches", async () => {
    const res = await app.inject({ method: "GET", url: "/personas?q=definitely-not-a-persona-xyz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});

describe("GET /personas/:id", () => {
  it("returns one persona", async () => {
    const res = await app.inject({ method: "GET", url: "/personas/p-001" });
    expect(res.statusCode).toBe(200);
    expect(res.json<Persona>().id).toBe("p-001");
  });

  it("404s for an unknown id", async () => {
    const res = await app.inject({ method: "GET", url: "/personas/nope" });
    expect(res.statusCode).toBe(404);
  });
});
