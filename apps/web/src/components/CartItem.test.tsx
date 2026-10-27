import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CartItem as CartItemType } from "@acme/shared";
import { FakeLink } from "~/test/router";
import { CartItem } from "./CartItem";

vi.mock("@tanstack/react-router", () => ({ Link: FakeLink }));

function item(quantity: number): CartItemType {
  return {
    id: "cart-1",
    personaId: "p-001",
    quantity,
    persona: {
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
    },
  };
}

describe("CartItem quantity controls", () => {
  it("disables the - button at quantity 1 so quantity can never reach 0", async () => {
    const onUpdateQuantity = vi.fn();
    render(<CartItem item={item(1)} onUpdateQuantity={onUpdateQuantity} onRemove={vi.fn()} />);

    const minus = screen.getByRole("button", { name: "-" });
    expect(minus).toBeDisabled();
    await userEvent.click(minus);
    expect(onUpdateQuantity).not.toHaveBeenCalled();
  });

  it("decrements when the quantity is above 1", async () => {
    const onUpdateQuantity = vi.fn();
    render(<CartItem item={item(2)} onUpdateQuantity={onUpdateQuantity} onRemove={vi.fn()} />);

    const minus = screen.getByRole("button", { name: "-" });
    expect(minus).toBeEnabled();
    await userEvent.click(minus);
    expect(onUpdateQuantity).toHaveBeenCalledWith(1);
  });

  it("increments with the + button", async () => {
    const onUpdateQuantity = vi.fn();
    render(<CartItem item={item(2)} onUpdateQuantity={onUpdateQuantity} onRemove={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "+" }));
    expect(onUpdateQuantity).toHaveBeenCalledWith(3);
  });
});
