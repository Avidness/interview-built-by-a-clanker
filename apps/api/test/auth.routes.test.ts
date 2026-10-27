import type { FastifyInstance } from "fastify";
import type { AuthResponse } from "@acme/shared";
import { createTestApp } from "./helpers.js";

let app: FastifyInstance;
beforeAll(async () => { app = await createTestApp(); });
afterAll(() => app.close());

const creds = { username: "alice", email: "alice@example.com", password: "secret123" };

describe("POST /auth/register", () => {
  it("creates a user and returns a token plus the public user", async () => {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: creds });
    expect(res.statusCode).toBe(201);
    const body = res.json<AuthResponse>();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toEqual({ id: expect.any(String), username: "alice", email: "alice@example.com" });
    expect(body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: creds });
    expect(res.statusCode).toBe(409);
  });

  it("validates input with 400", async () => {
    const res = await app.inject({
      method: "POST", url: "/auth/register",
      payload: { username: "ab", email: "not-an-email", password: "123" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("returns a token and the same public user shape as register", async () => {
    const res = await app.inject({ method: "POST", url: "/auth/login", payload: { email: creds.email, password: creds.password } });
    expect(res.statusCode).toBe(200);
    const body = res.json<AuthResponse>();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toEqual({ id: expect.any(String), username: "alice", email: "alice@example.com" });
  });

  it("rejects a wrong password with 401", async () => {
    const res = await app.inject({ method: "POST", url: "/auth/login", payload: { email: creds.email, password: "wrong" } });
    expect(res.statusCode).toBe(401);
  });

  it("rejects an unknown email with 401", async () => {
    const res = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "nobody@example.com", password: "x" } });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("returns the current user for a valid token", async () => {
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: creds.email, password: creds.password } });
    const { token } = login.json<AuthResponse>();
    const res = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: expect.any(String), username: "alice", email: "alice@example.com" });
  });

  it("401s without a token", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("401s with a garbage token", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: "Bearer nope" } });
    expect(res.statusCode).toBe(401);
  });
});
