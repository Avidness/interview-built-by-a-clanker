import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cart, User } from "@acme/shared";
import { api } from "~/lib/api";
import { invalidateCart } from "~/lib/cart";
import { FakeLink } from "~/test/router";

const alice: User = { id: "user-1", username: "alice", email: "alice@example.com" };
const state: { user: User | null; cart: Cart } = { user: alice, cart: { items: [], total: 0 } };

vi.mock("@tanstack/react-router", () => ({
  Link: FakeLink,
  Outlet: () => null,
  useRouter: () => ({ navigate: vi.fn() }),
  createRootRoute: (options: object) => ({ options }),
}));

vi.mock("~/lib/auth", () => ({
  useAuth: () => ({ user: state.user, token: null, isLoading: false, login: vi.fn(), logout: vi.fn() }),
}));

vi.mock("~/lib/api", () => ({
  api: { get: vi.fn(async () => state.cart) },
}));

function cartWith(quantity: number): Cart {
  return { items: [{ id: "cart-1", personaId: "p-001", quantity, persona: {} as Cart["items"][0]["persona"] }], total: 0 };
}

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  state.user = alice;
  state.cart = cartWith(1);
});

async function renderHeader() {
  const { Route } = await import("./__root");
  const Layout = Route.options.component as React.ComponentType;
  render(
    <QueryClientProvider client={queryClient}>
      <Layout />
    </QueryClientProvider>,
  );
}

function badge() {
  return screen.getByRole("link", { name: /^\d*$/ });
}

describe("RootLayout cart badge", () => {
  it("shows the number of items in the cart", async () => {
    await renderHeader();
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("refreshes when the cart is invalidated after a mutation", async () => {
    await renderHeader();
    await screen.findByText("1");

    state.cart = cartWith(3);
    await act(() => invalidateCart(queryClient));

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(badge()).toHaveTextContent("3");
  });

  it("does not fetch the cart for guests", async () => {
    state.user = null;
    await renderHeader();
    expect(api.get).not.toHaveBeenCalled();
  });
});
