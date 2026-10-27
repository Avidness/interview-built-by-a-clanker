import type { Cart, CartItem } from "@acme/shared";
import { db } from "../db.js";

/** The user's cart as the API returns it: stored lines joined with their persona, plus a rounded total. */
export function buildCart(userId: string): Cart {
  const items: CartItem[] = [];
  let total = 0;

  for (const entry of db.cart.getByUserId(userId)) {
    const persona = db.personas.getById(entry.personaId);
    if (!persona) continue;

    items.push({
      id: entry.id,
      personaId: entry.personaId,
      persona,
      quantity: entry.quantity,
    });

    total += persona.price * entry.quantity;
  }

  return { items, total: Math.round(total * 100) / 100 };
}
