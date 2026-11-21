import { describe, it, expect, beforeEach, vi } from "vitest";
import { useToast } from "../useToast";

describe("useToast (@zebra/core createToastStore)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToast.getState().clearToasts();
  });

  it("shows and auto-dismisses a toast after duration", () => {
    useToast.getState().showToast("Saved!", "success");
    expect(useToast.getState().toasts).toHaveLength(1);
    expect(useToast.getState().toasts[0].message).toBe("Saved!");

    vi.advanceTimersByTime(2500);
    expect(useToast.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });

  it("removes a toast manually without leaking pending timers", () => {
    useToast.getState().showToast("Temporary", "info");
    const id = useToast.getState().toasts[0].id;

    useToast.getState().removeToast(id);
    expect(useToast.getState().toasts).toHaveLength(0);

    vi.advanceTimersByTime(5000);
    expect(useToast.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });
});
