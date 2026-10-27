import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

const fetchMock = vi.fn();

function sentHeaders(): Record<string, string> {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
  return (init.headers as Record<string, string>) ?? {};
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api request headers", () => {
  it("does not send a JSON content-type on a body-less DELETE", async () => {
    await api.delete("/cart/cart-1");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sentHeaders()).not.toHaveProperty("Content-Type");
  });

  it("does not send a JSON content-type on a GET", async () => {
    await api.get("/personas");
    expect(sentHeaders()).not.toHaveProperty("Content-Type");
  });

  it("sends a JSON content-type on a POST with a body", async () => {
    await api.post("/favorites", { personaId: "p-001" });
    expect(sentHeaders()["Content-Type"]).toBe("application/json");
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({ personaId: "p-001" }));
  });

  it("still attaches the bearer token on a DELETE", async () => {
    localStorage.setItem("auth_token", "tok-1");
    await api.delete("/favorites/p-001");
    expect(sentHeaders()["Authorization"]).toBe("Bearer tok-1");
  });
});
