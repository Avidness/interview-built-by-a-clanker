import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StarRating } from "./StarRating";

function gradientsOf(container: HTMLElement) {
  return Array.from(container.querySelectorAll("linearGradient"));
}

describe("StarRating partial stars", () => {
  it("gives each partial star its own gradient id so two ratings on one page do not share a fill", () => {
    const { container } = render(
      <>
        <StarRating rating={4.4} />
        <StarRating rating={4.9} />
      </>,
    );

    const gradients = gradientsOf(container);
    expect(gradients).toHaveLength(2);
    const [a, b] = gradients.map((g) => g.id);
    expect(a).not.toEqual(b);
  });

  it("points each partial star at its own gradient with the right stop offset", () => {
    const { container } = render(<StarRating rating={3.5} />);

    const [gradient] = gradientsOf(container);
    const partialStar = gradient.closest("svg")!;
    expect(partialStar).toHaveAttribute("fill", `url(#${gradient.id})`);
    expect(gradient.querySelector("stop")).toHaveAttribute("offset", "50%");
  });

  it("renders no gradient for a whole-number rating", () => {
    const { container } = render(<StarRating rating={4} />);
    expect(gradientsOf(container)).toHaveLength(0);
  });
});
