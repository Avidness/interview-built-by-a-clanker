import type { FastifyInstance } from "fastify";
import { addToCartSchema, updateCartItemSchema } from "@acme/shared";
import { db } from "../db.js";
import { buildCart } from "../lib/cart.js";
import { authenticate } from "../middleware/auth.js";

export async function cartRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/cart", async (request) => {
    const { id: userId } = request.user as { id: string };
    return buildCart(userId);
  });

  app.post("/cart", async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const parsed = addToCartSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { personaId, quantity } = parsed.data;

    const persona = db.personas.getById(personaId);
    if (!persona) {
      return reply.status(404).send({ error: "Persona not found" });
    }

    db.cart.add(userId, personaId, quantity);
    return buildCart(userId);
  });

  app.put<{ Params: { itemId: string } }>("/cart/:itemId", async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const parsed = updateCartItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const item = db.cart.getById(request.params.itemId);
    if (!item || item.userId !== userId) {
      return reply.status(404).send({ error: "Cart item not found" });
    }

    db.cart.update(request.params.itemId, parsed.data.quantity);
    return buildCart(userId);
  });

  app.delete<{ Params: { itemId: string } }>("/cart/:itemId", async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const item = db.cart.getById(request.params.itemId);
    if (!item || item.userId !== userId) {
      return reply.status(404).send({ error: "Cart item not found" });
    }

    db.cart.remove(request.params.itemId);
    return buildCart(userId);
  });
}
