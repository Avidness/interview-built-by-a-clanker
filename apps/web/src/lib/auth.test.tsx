import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { api } from "./api";
import { AuthProvider, useAuth } from "./auth";

vi.mock("./api", () => ({
  api: { get: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const alice = { id: "user-1", username: "alice", email: "alice@example.com" };

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe("AuthProvider", () => {
  it("restores the session from a stored token", async () => {
    localStorage.setItem("auth_token", "tok-1");
    vi.mocked(api.get).mockResolvedValue(alice);

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.user).toEqual(alice));
    expect(result.current.isLoading).toBe(false);
  });

  it("stores the token on login", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => result.current.login({ token: "tok-2", user: alice }));

    expect(result.current.user).toEqual(alice);
    expect(localStorage.getItem("auth_token")).toBe("tok-2");
  });

  it("forgets the token on logout so a reload stays signed out", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login({ token: "tok-3", user: alice }));

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
  });
});
