import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "~/components/SearchBar";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function type(text: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
}

describe("SearchBar", () => {
  it("debounces onChange by 300 ms", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);

    type("agent");
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("agent");
  });

  it("only emits the final value when keystrokes arrive within the window", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);

    type("a");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    type("ab");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("ab");
  });

  it("clears immediately via the clear button without waiting for the debounce", () => {
    const onChange = vi.fn();
    render(<SearchBar value="agent" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("");
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
  });
});
