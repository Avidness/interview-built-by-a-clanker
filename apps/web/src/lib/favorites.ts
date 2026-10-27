import type { Persona } from "@acme/shared";
import { api } from "./api";

export const FAVORITES_QUERY_KEY = ["favorites"] as const;

/** Adds the persona to favorites if it is not one yet, otherwise removes it. */
export function toggleFavorite(personaId: string, isFavorited: boolean) {
  return isFavorited
    ? api.delete<{ success: boolean }>(`/favorites/${personaId}`)
    : api.post<{ success: boolean }>("/favorites", { personaId });
}

/** The current user's favorite persona ids. Only fetched when signed in. */
export function favoriteIdsQueryOptions(isSignedIn: boolean) {
  return {
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<{ favorites: Persona[] }>("/favorites");
      return res.favorites.map((p) => p.id);
    },
    enabled: isSignedIn,
  };
}
