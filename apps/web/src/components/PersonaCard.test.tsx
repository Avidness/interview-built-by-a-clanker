import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Persona } from "@acme/shared";
import { FakeLink } from "~/test/router";
import { PersonaCard } from "./PersonaCard";

vi.mock("@tanstack/react-router", () => ({ Link: FakeLink }));

const rex: Persona = {
  id: "p-001",
  name: "Refactor Rex",
  tagline: "Your relentless code reviewer",
  description: "Reviews code.",
  avatarUrl: "https://example.com/rex.svg",
  specialty: "Engineering",
  capabilities: ["Code review", "Complexity analysis", "Design patterns", "Debt"],
  price: 49.99,
  rating: 4.8,
  reviewCount: 234,
  tier: "Pro",
};

describe("PersonaCard", () => {
  it("shows the persona's monthly price in dollars", () => {
    render(<PersonaCard persona={rex} />);
    expect(screen.getByText(/^\$49\.99/)).toBeInTheDocument();
    expect(screen.queryByText(/4999/)).not.toBeInTheDocument();
  });

  it("links to the persona detail page", () => {
    render(<PersonaCard persona={rex} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/personas/p-001");
  });
});
