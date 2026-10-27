import type { FastifyInstance, InjectOptions } from "fastify";
import { buildApp } from "../src/app.js";

let counter = 0;

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

export interface TestUser {
  token: string;
  user: { id: string; username: string; email: string };
  auth: { authorization: string };
}

/** Registers a fresh unique user and returns its token plus a ready-to-spread auth header. */
export async function registerUser(app: FastifyInstance): Promise<TestUser> {
  const n = ++counter;
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { username: `user${n}`, email: `user${n}-${Date.now()}@example.com`, password: "secret123" },
  });
  if (res.statusCode !== 201) {
    throw new Error(`register failed: ${res.statusCode} ${res.body}`);
  }
  const body = res.json<{ token: string; user: TestUser["user"] }>();
  return { token: body.token, user: body.user, auth: { authorization: `Bearer ${body.token}` } };
}

export function authed(user: TestUser, options: InjectOptions): InjectOptions {
  return { ...options, headers: { ...(options.headers ?? {}), ...user.auth } };
}
