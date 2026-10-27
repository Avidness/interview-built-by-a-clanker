/**
 * B1 regression: with ENFORCE_AUTH unset (the default `pnpm dev` config)
 * protected routes must still behave - either verify the token (200) or
 * reject (401) - never crash with a 500 because `request.user` is missing.
 *
 * setup-env.ts forces ENFORCE_AUTH=true for every suite, and
 * middleware/auth.ts reads the flag at import time, so this file clears the
 * variable first and then imports the app dynamically. Jest gives each test
 * file its own module registry, so nothing here leaks into the other suites.
 */
import type { FastifyInstance } from "fastify";

// The flag must be absent (not "false") to mirror the default `pnpm dev` config.
delete process.env.ENFORCE_AUTH;

let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  const { buildApp } = await import("../src/app.js");
  app = await buildApp({ logger: false });
  await app.ready();

  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { username: "defaultcfg", email: `defaultcfg-${Date.now()}@example.com`, password: "secret123" },
  });
  expect(res.statusCode).toBe(201);
  token = res.json<{ token: string }>().token;
});

afterAll(() => app.close());

describe("protected routes without ENFORCE_AUTH set (B1)", () => {
  it("GET /cart with a valid token returns 200 or 401, never 500", async () => {
    const res = await app.inject({ method: "GET", url: "/cart", headers: { authorization: `Bearer ${token}` } });
    expect([200, 401]).toContain(res.statusCode);
  });

  it("GET /cart without a token returns 401, never 500", async () => {
    const res = await app.inject({ method: "GET", url: "/cart" });
    expect(res.statusCode).toBe(401);
  });
});
