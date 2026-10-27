import { describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { FAVORITES_QUERY_KEY, favoriteIdsQueryOptions, favoritesQueryOptions, toggleFavorite } from "./favorites";

vi.mock("./api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe("toggleFavorite", () => {
  it("adds the persona when it is not yet a favorite", async () => {
    await toggleFavorite("p-001", false);
    expect(api.post).toHaveBeenCalledWith("/favorites", { personaId: "p-001" });
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("removes the persona when it is already a favorite", async () => {
    await toggleFavorite("p-001", true);
    expect(api.delete).toHaveBeenCalledWith("/favorites/p-001");
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("favoriteIdsQueryOptions", () => {
  it("maps the API response to a list of persona ids", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      favorites: [{ id: "p-001" }, { id: "p-007" }],
    });
    await expect(favoriteIdsQueryOptions(true).queryFn()).resolves.toEqual(["p-001", "p-007"]);
    expect(api.get).toHaveBeenCalledWith("/favorites");
  });

  it("is disabled for guests so the page never sends an unauthenticated request", () => {
    expect(favoriteIdsQueryOptions(false).enabled).toBe(false);
    expect(favoriteIdsQueryOptions(true).enabled).toBe(true);
  });
});

describe("favorites query keys (FINDINGS B5)", () => {
  it("gives the id list and the full list distinct keys so their cache entries never collide", () => {
    const ids = favoriteIdsQueryOptions(true).queryKey;
    const full = favoritesQueryOptions(true).queryKey;
    expect(ids).not.toEqual(full);
    // Both stay under the shared prefix so invalidating FAVORITES_QUERY_KEY refreshes both.
    expect(ids.slice(0, FAVORITES_QUERY_KEY.length)).toEqual([...FAVORITES_QUERY_KEY]);
    expect(full.slice(0, FAVORITES_QUERY_KEY.length)).toEqual([...FAVORITES_QUERY_KEY]);
  });

  it("fetches the full persona list for the favorites page", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ favorites: [{ id: "p-001" }] });
    await expect(favoritesQueryOptions(true).queryFn()).resolves.toEqual({ favorites: [{ id: "p-001" }] });
  });
});
