import { describe, expect, it } from "vitest";
import {
  addToCartSchema,
  checkoutSchema,
  loginSchema,
  personaFilterSchema,
  registerSchema,
  updateCartItemSchema,
} from "../src/index.js";

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({ username: "alice", email: "alice@example.com", password: "secret123" });
    expect(result.success).toBe(true);
  });

  it.each([
    ["short username", { username: "ab", email: "alice@example.com", password: "secret123" }],
    ["invalid email", { username: "alice", email: "not-an-email", password: "secret123" }],
    ["short password", { username: "alice", email: "alice@example.com", password: "123" }],
    ["missing fields", { username: "alice" }],
  ])("rejects %s", (_label, input) => {
    expect(registerSchema.safeParse(input).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts an email and any non-empty-typed password", () => {
    expect(loginSchema.safeParse({ email: "alice@example.com", password: "x" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "alice", password: "secret123" }).success).toBe(false);
  });
});

describe("cart schemas", () => {
  it("defaults quantity to 1 when adding to the cart", () => {
    const result = addToCartSchema.parse({ personaId: "p-001" });
    expect(result).toEqual({ personaId: "p-001", quantity: 1 });
  });

  it("requires a positive integer quantity", () => {
    expect(addToCartSchema.safeParse({ personaId: "p-001", quantity: 0 }).success).toBe(false);
    expect(addToCartSchema.safeParse({ personaId: "p-001", quantity: 1.5 }).success).toBe(false);
    expect(updateCartItemSchema.safeParse({ quantity: 0 }).success).toBe(false);
    expect(updateCartItemSchema.safeParse({ quantity: 3 }).success).toBe(true);
  });

  it("does not coerce string quantities", () => {
    expect(addToCartSchema.safeParse({ personaId: "p-001", quantity: "2" }).success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("requires a name and a valid email", () => {
    expect(checkoutSchema.safeParse({ name: "Alice", email: "alice@example.com" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ name: "", email: "alice@example.com" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ name: "Alice", email: "nope" }).success).toBe(false);
  });
});

describe("personaFilterSchema", () => {
  it("accepts an empty query", () => {
    expect(personaFilterSchema.parse({})).toEqual({});
  });

  it("coerces minPrice and maxPrice from query-string values to numbers", () => {
    const result = personaFilterSchema.parse({ minPrice: "10", maxPrice: "99.5" });
    expect(result.minPrice).toBe(10);
    expect(result.maxPrice).toBe(99.5);
  });

  it("rejects a non-numeric minPrice", () => {
    expect(personaFilterSchema.safeParse({ minPrice: "abc" }).success).toBe(false);
  });

  it("validates specialty, tier and sort against their enums", () => {
    expect(
      personaFilterSchema.safeParse({ q: "ops", specialty: "DevOps", tier: "Pro", sort: "price-asc" }).success,
    ).toBe(true);
    expect(personaFilterSchema.safeParse({ specialty: "Cooking" }).success).toBe(false);
    expect(personaFilterSchema.safeParse({ tier: "Gold" }).success).toBe(false);
    expect(personaFilterSchema.safeParse({ sort: "random" }).success).toBe(false);
  });
});
