import { describe, expect, it, vi } from "vitest";
import { personasQueryOptions } from "./personas";
import { api } from "./api";

vi.mock("./api", () => ({
  api: { get: vi.fn().mockResolvedValue([]) },
}));

describe("personasQueryOptions", () => {
  it("uses a different query key for different filters, so changing a filter refetches", () => {
    const all = personasQueryOptions({});
    const engineering = personasQueryOptions({ specialty: "Engineering" });
    const sorted = personasQueryOptions({ specialty: "Engineering", sort: "price-asc" });

    expect(all.queryKey).not.toEqual(engineering.queryKey);
    expect(engineering.queryKey).not.toEqual(sorted.queryKey);
  });

  it("uses the same query key for the same filters, so the cache is reused", () => {
    expect(personasQueryOptions({ q: "rex" }).queryKey).toEqual(
      personasQueryOptions({ q: "rex" }).queryKey,
    );
  });

  it("requests /personas with the active filters as a query string", async () => {
    await personasQueryOptions({ q: "rex", tier: "Pro", minPrice: 10 }).queryFn();
    expect(api.get).toHaveBeenCalledWith("/personas?q=rex&tier=Pro&minPrice=10");
  });

  it("requests bare /personas when there are no filters", async () => {
    await personasQueryOptions({}).queryFn();
    expect(api.get).toHaveBeenCalledWith("/personas");
  });
});
