import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StarRating } from "~/components/StarRating";

afterEach(cleanup);

describe("StarRating", () => {
  it("renders the numeric rating to one decimal place", () => {
    render(<StarRating rating={4.26} />);
    expect(screen.getByText("4.3")).toBeTruthy();
  });

  it("renders an integer rating with a trailing .0", () => {
    render(<StarRating rating={5} />);
    expect(screen.getByText("5.0")).toBeTruthy();
  });

  it("always draws five stars", () => {
    const { container } = render(<StarRating rating={2.5} size="sm" />);
    expect(container.querySelectorAll("svg")).toHaveLength(5);
  });
});
