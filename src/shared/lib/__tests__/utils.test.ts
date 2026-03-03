import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  it("should merge tailwind classes properly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("should handle conditional classes using clsx syntax", () => {
    const isError = true;
    expect(
      cn("base-class", { "text-red-500": isError, "text-green-500": !isError }),
    ).toBe("base-class text-red-500");
  });

  it("should resolve tailwind class conflicts correctly", () => {
    expect(cn("p-4 px-2")).toBe("p-4 px-2");
    expect(cn("px-2 p-4")).toBe("p-4"); // padding replaces px
  });
});
