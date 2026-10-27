import type { QueryClient } from "@tanstack/react-query";
import type { Cart } from "@acme/shared";
import { api } from "./api";

/**
 * Single cache entry for the current user's cart. The header badge, the cart
 * page and the checkout page all read this key, and every cart mutation
 * invalidates it, so they can never disagree.
 */
export const CART_QUERY_KEY = ["cart"] as const;

export function cartQueryOptions(isSignedIn: boolean) {
  return {
    queryKey: CART_QUERY_KEY,
    queryFn: () => api.get<Cart>("/cart"),
    enabled: isSignedIn,
  };
}

export function invalidateCart(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
}
