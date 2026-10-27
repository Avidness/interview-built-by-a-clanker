import type { Persona } from "@acme/shared";
import { api } from "./api";

export interface PersonaSearch {
  q?: string;
  specialty?: string;
  tier?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}

function toQueryString(search: PersonaSearch): string {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (search.specialty) params.set("specialty", search.specialty);
  if (search.tier) params.set("tier", search.tier);
  if (search.minPrice) params.set("minPrice", String(search.minPrice));
  if (search.maxPrice) params.set("maxPrice", String(search.maxPrice));
  if (search.sort) params.set("sort", search.sort);
  return params.toString();
}

/**
 * Query options for the persona catalog. The active filters are part of the
 * query key, so changing any filter fetches a fresh result instead of
 * reusing the cached list for the previous filters.
 */
export function personasQueryOptions(search: PersonaSearch) {
  const qs = toQueryString(search);
  return {
    queryKey: ["personas", qs] as const,
    queryFn: () => api.get<Persona[]>(`/personas${qs ? `?${qs}` : ""}`),
  };
}
