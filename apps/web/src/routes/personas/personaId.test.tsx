import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Persona, User } from "@acme/shared";
import { api } from "~/lib/api";
import { FakeLink } from "~/test/router";

const rex: Persona = {
  id: "p-001",
  name: "Refactor Rex",
  tagline: "Your relentless code reviewer",
  description: "Reviews code.",
  avatarUrl: "https://example.com/rex.svg",
  specialty: "Engineering",
  capabilities: ["Code review"],
  price: 49.99,
  rating: 4.8,
  reviewCount: 234,
  tier: "Pro",
};

const alice: User = { id: "user-1", username: "alice", email: "alice@example.com" };

// Mutable per-test state read by the mocks below.
const state: { user: User | null; favoriteIds: string[] } = { user: null, favoriteIds: [] };

vi.mock("@tanstack/react-router", () => ({
  Link: FakeLink,
  createFileRoute: () => (options: object) => ({
    options,
    useParams: () => ({ personaId: "p-001" }),
  }),
}));

vi.mock("~/lib/auth", () => ({
  useAuth: () => ({ user: state.user, token: null, isLoading: false, login: vi.fn(), logout: vi.fn() }),
}));

vi.mock("~/lib/api", () => ({
  api: {
    get: vi.fn(async (path: string) => {
      if (path === "/personas/p-001") return rex;
      if (path === "/favorites") {
        return { favorites: state.favoriteIds.map((id) => ({ ...rex, id })) };
      }
      throw new Error(`unexpected GET ${path}`);
    }),
    post: vi.fn().mockResolvedValue({ success: true }),
    put: vi.fn(),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// The page imports the singleton client for invalidation; give it a fresh one per test.
let queryClient: QueryClient;
vi.mock("~/lib/queryClient", () => ({
  get queryClient() {
    return queryClient;
  },
}));

async function renderPage() {
  const { Route } = await import("./$personaId");
  const Page = Route.options.component as React.ComponentType;
  render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "Refactor Rex" });
}

function heartButton() {
  // The heart is the only icon-only button next to "Add to Cart".
  return screen.getAllByRole("button").find((b) => b.textContent === "")!;
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  state.user = alice;
  state.favoriteIds = [];
});

describe("PersonaDetailPage favorites", () => {
  it("adds the persona to favorites when the heart is clicked and it is not a favorite yet", async () => {
    await renderPage();
    await userEvent.click(heartButton());

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/favorites", { personaId: "p-001" }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("removes the persona from favorites when the heart is clicked and it is already a favorite", async () => {
    state.favoriteIds = ["p-001"];
    await renderPage();
    await waitFor(() => expect(heartButton().querySelector("svg")).toHaveAttribute("fill", "currentColor"));
    await userEvent.click(heartButton());

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/favorites/p-001"));
    expect(api.post).not.toHaveBeenCalled();
  });
});
