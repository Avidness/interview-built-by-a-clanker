import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@acme/shared";
import { FakeLink } from "~/test/router";
import { AuthGate } from "./AuthGate";

const state: { user: User | null; isLoading: boolean } = { user: null, isLoading: false };

vi.mock("@tanstack/react-router", () => ({ Link: FakeLink }));
vi.mock("~/lib/auth", () => ({
  useAuth: () => ({ user: state.user, isLoading: state.isLoading, token: null, login: vi.fn(), logout: vi.fn() }),
}));

function renderGate() {
  return render(
    <AuthGate title="Sign in to view your cart" fallback={<div data-testid="skeleton" />}>
      <div>Your Cart</div>
    </AuthGate>,
  );
}

beforeEach(() => {
  state.user = null;
  state.isLoading = false;
});

describe("AuthGate", () => {
  it("shows the fallback, not the sign-in prompt, while the session is being restored", () => {
    state.isLoading = true;
    renderGate();

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sign in to view your cart" })).not.toBeInTheDocument();
    expect(screen.queryByText("Your Cart")).not.toBeInTheDocument();
  });

  it("prompts guests to sign in", () => {
    renderGate();

    expect(screen.getByRole("heading", { name: "Sign in to view your cart" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByText("Your Cart")).not.toBeInTheDocument();
  });

  it("renders the page for a signed-in user", () => {
    state.user = { id: "user-1", username: "alice", email: "alice@example.com" };
    renderGate();

    expect(screen.getByText("Your Cart")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Sign in/ })).not.toBeInTheDocument();
  });
});
