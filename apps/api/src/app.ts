import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { personaRoutes } from "./routes/personas.js";
import { authRoutes } from "./routes/auth.js";
import { cartRoutes } from "./routes/cart.js";
import { favoriteRoutes } from "./routes/favorites.js";
import { checkoutRoutes } from "./routes/checkout.js";
import { orderRoutes } from "./routes/orders.js";

export interface BuildAppOptions {
  logger?: boolean;
  webOrigin?: string;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, {
    origin: options.webOrigin ?? process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  await app.register(jwt, { secret: "agentic-personas-dev-secret" });

  await app.register(personaRoutes);
  await app.register(authRoutes);
  await app.register(cartRoutes);
  await app.register(favoriteRoutes);
  await app.register(checkoutRoutes);
  await app.register(orderRoutes);

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
