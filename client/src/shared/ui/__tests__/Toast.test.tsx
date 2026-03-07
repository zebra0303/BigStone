// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Toast } from "../Toast";

describe("Toast", () => {
  it("should render the message", () => {
    render(<Toast message="Task copied" onClose={() => {}} />);
    expect(screen.getByText("Task copied")).toBeDefined();
  });

  it("should call onClose after duration", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(<Toast message="Done" duration={1000} onClose={onClose} />);

    // Advance past duration
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Advance past exit animation (200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("should display CheckCircle icon", () => {
    const { container } = render(
      <Toast message="Success" onClose={() => {}} />,
    );
    // Lucide renders an SVG element
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("should use default duration of 2000ms", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(<Toast message="Test" onClose={onClose} />);

    // Should NOT have called onClose before 2000ms
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(onClose).not.toHaveBeenCalled();

    // Should call after 2000ms + 200ms animation
    act(() => {
      vi.advanceTimersByTime(201);
    });
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
