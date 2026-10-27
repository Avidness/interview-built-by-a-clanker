import type { FastifyInstance } from "fastify";
import type { Persona } from "@acme/shared";
import { jest } from "@jest/globals";
import { db } from "../src/db.js";
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

  it.each([
    ["specialty=Cooking", "unknown specialty"],
    ["tier=Platinum", "unknown tier"],
    ["sort=random", "unknown sort"],
    ["minPrice=abc", "non-numeric minPrice"],
    ["maxPrice=1e999x", "non-numeric maxPrice"],
  ])("rejects ?%s (%s) with 400 via the shared filter schema", async (qs) => {
    const res = await app.inject({ method: "GET", url: `/personas?${qs}` });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toHaveProperty("error");
  });

  it("coerces numeric query strings for the price range", async () => {
    const res = await app.inject({ method: "GET", url: "/personas?minPrice=40&maxPrice=80" });
    expect(res.statusCode).toBe(200);
    const body = res.json<Persona[]>();
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((p) => p.price >= 40 && p.price <= 80)).toBe(true);
  });

  it("returns an empty list, not an error, when nothing matches", async () => {
    const res = await app.inject({ method: "GET", url: "/personas?q=definitely-not-a-persona-xyz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  describe("query validation (personaFilterSchema)", () => {
    it("400s on a non-numeric minPrice", async () => {
      const res = await app.inject({ method: "GET", url: "/personas?minPrice=abc" });
      expect(res.statusCode).toBe(400);
      expect(res.json<{ error: { fieldErrors: Record<string, string[]> } }>().error.fieldErrors.minPrice).toBeDefined();
    });

    it("400s on an unknown sort value", async () => {
      const res = await app.inject({ method: "GET", url: "/personas?sort=bogus" });
      expect(res.statusCode).toBe(400);
      expect(res.json<{ error: { fieldErrors: Record<string, string[]> } }>().error.fieldErrors.sort).toBeDefined();
    });

    it("400s on unknown specialty and tier values", async () => {
      expect((await app.inject({ method: "GET", url: "/personas?specialty=Cooking" })).statusCode).toBe(400);
      expect((await app.inject({ method: "GET", url: "/personas?tier=Platinum" })).statusCode).toBe(400);
    });

    it("honours minPrice=0 instead of dropping it as falsy", async () => {
      const search = jest.spyOn(db.personas, "search");
      const res = await app.inject({ method: "GET", url: "/personas?minPrice=0" });
      expect(res.statusCode).toBe(200);
      expect(search).toHaveBeenCalledWith(expect.objectContaining({ minPrice: 0 }));
    });

    it("still coerces valid numeric prices", async () => {
      const search = jest.spyOn(db.personas, "search");
      const res = await app.inject({ method: "GET", url: "/personas?minPrice=10&maxPrice=50" });
      expect(res.statusCode).toBe(200);
      expect(search).toHaveBeenCalledWith(expect.objectContaining({ minPrice: 10, maxPrice: 50 }));
    });
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
