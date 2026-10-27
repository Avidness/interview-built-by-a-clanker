import { describe, expect, it } from "vitest";
import { Route } from "./index";

// GAPS 2.5: the browse route validates its search params with the shared
// personaFilterSchema, dropping each invalid value on its own so one bad
// param does not discard the rest of the search.
const validate = Route.options.validateSearch as (search: Record<string, unknown>) => Record<string, unknown>;

describe("browse route validateSearch", () => {
  it("keeps valid params and coerces prices to numbers", () => {
    expect(
      validate({ q: "rex", specialty: "Design", tier: "Pro", minPrice: "10", maxPrice: "50", sort: "price-asc" }),
    ).toEqual({
      q: "rex",
      specialty: "Design",
      tier: "Pro",
      minPrice: 10,
      maxPrice: 50,
      sort: "price-asc",
    });
  });

  it("drops unknown enum values and non-numeric prices without discarding the rest", () => {
    expect(validate({ q: "rex", tier: "Platinum", specialty: "Magic", sort: "bogus", minPrice: "abc" })).toEqual({
      q: "rex",
    });
  });

  it("drops empty strings and unknown keys", () => {
    expect(validate({ q: "", specialty: "", page: "2" })).toEqual({});
  });
});
