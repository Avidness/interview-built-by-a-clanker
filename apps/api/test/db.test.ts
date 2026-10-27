import { db } from "../src/db.js";

describe("db.personas.search", () => {
  const all = db.personas.getAll();

  it("returns every seeded persona with no filters", () => {
    expect(db.personas.search({})).toHaveLength(all.length);
    expect(all.length).toBeGreaterThan(0);
  });

  it("matches q against name, tagline, description and capabilities, case-insensitively", () => {
    const byName = db.personas.search({ q: "refactor rex" });
    expect(byName.map((p) => p.id)).toContain("p-001");

    const byCapability = db.personas.search({ q: "code review" });
    expect(byCapability.length).toBeGreaterThan(0);
    for (const p of byCapability) {
      const hay = [p.name, p.tagline, p.description, ...p.capabilities].join(" ").toLowerCase();
      expect(hay).toContain("code review");
    }
  });

  it("filters by specialty and tier", () => {
    const eng = db.personas.search({ specialty: "Engineering" });
    expect(eng.length).toBeGreaterThan(0);
    expect(eng.every((p) => p.specialty === "Engineering")).toBe(true);

    const pro = db.personas.search({ tier: "Pro" });
    expect(pro.length).toBeGreaterThan(0);
    expect(pro.every((p) => p.tier === "Pro")).toBe(true);
  });

  it("minPrice keeps personas priced at or above the minimum", () => {
    const prices = all.map((p) => p.price).sort((a, b) => a - b);
    const mid = prices[Math.floor(prices.length / 2)];
    const results = db.personas.search({ minPrice: mid });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.price >= mid)).toBe(true);
  });

  it("maxPrice keeps personas priced at or below the maximum", () => {
    const prices = all.map((p) => p.price).sort((a, b) => a - b);
    const mid = prices[Math.floor(prices.length / 2)];
    const results = db.personas.search({ maxPrice: mid });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.price <= mid)).toBe(true);
  });

  it("combines minPrice and maxPrice into a range", () => {
    const results = db.personas.search({ minPrice: 40, maxPrice: 80 });
    expect(results.every((p) => p.price >= 40 && p.price <= 80)).toBe(true);
  });

  it.each([
    ["price-asc", (a: number, b: number) => a <= b, (p: { price: number }) => p.price],
    ["price-desc", (a: number, b: number) => a >= b, (p: { price: number }) => p.price],
    ["rating-desc", (a: number, b: number) => a >= b, (p: { rating: number }) => p.rating],
  ])("sorts by %s", (sort, inOrder, key) => {
    const results = db.personas.search({ sort });
    expect(results).toHaveLength(all.length);
    for (let i = 1; i < results.length; i++) {
      expect(inOrder(key(results[i - 1]), key(results[i]))).toBe(true);
    }
  });

  it("sorts by name-asc", () => {
    const names = db.personas.search({ sort: "name-asc" }).map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("does not mutate the seeded order when sorting", () => {
    const before = db.personas.getAll().map((p) => p.id);
    db.personas.search({ sort: "price-desc" });
    expect(db.personas.getAll().map((p) => p.id)).toEqual(before);
  });
});

describe("db.cart", () => {
  const userId = "cart-test-user";

  afterEach(() => db.cart.clearForUser(userId));

  it("adds an entry and lists it for the user only", () => {
    db.cart.add(userId, "p-001", 1);
    expect(db.cart.getByUserId(userId)).toHaveLength(1);
    expect(db.cart.getByUserId("someone-else")).toHaveLength(0);
  });

  it("merges quantity when the same persona is added twice", () => {
    db.cart.add(userId, "p-001", 1);
    db.cart.add(userId, "p-001", 2);
    const entries = db.cart.getByUserId(userId);
    expect(entries).toHaveLength(1);
    expect(entries[0].quantity).toBe(3);
  });

  it("updates and removes by id", () => {
    const entry = db.cart.add(userId, "p-002", 1);
    expect(db.cart.update(entry.id, 5)?.quantity).toBe(5);
    expect(db.cart.remove(entry.id)).toBe(true);
    expect(db.cart.getById(entry.id)).toBeUndefined();
  });
});

describe("db.favorites", () => {
  const userId = "fav-test-user";

  it("adds, de-duplicates, checks and removes", () => {
    db.favorites.add(userId, "p-001");
    db.favorites.add(userId, "p-001");
    expect(db.favorites.getByUserId(userId)).toEqual(["p-001"]);
    expect(db.favorites.isFavorite(userId, "p-001")).toBe(true);
    expect(db.favorites.remove(userId, "p-001")).toBe(true);
    expect(db.favorites.remove(userId, "p-001")).toBe(false);
    expect(db.favorites.isFavorite(userId, "p-001")).toBe(false);
  });
});
