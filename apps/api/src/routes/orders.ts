import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { authenticate } from "../middleware/auth.js";

export async function orderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/orders", async (request) => {
    const { id: userId } = request.user as { id: string };
    return { orders: db.orders.getByUserId(userId) };
  });
}
