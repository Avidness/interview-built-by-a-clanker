import { describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { favoriteIdsQueryOptions, toggleFavorite } from "./favorites";

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
    await expect(favoriteIdsQueryOptions().queryFn()).resolves.toEqual(["p-001", "p-007"]);
    expect(api.get).toHaveBeenCalledWith("/favorites");
  });
});
