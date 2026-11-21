import { describe, it, expect } from "vitest";
import { isCorsOriginAllowed } from "../cors";

describe("BigStone CORS origin validation", () => {
  const defaultAllowed = ["http://localhost:5173"];

  it("allows same-origin requests behind a reverse proxy without CORS_ORIGIN", () => {
    expect(
      isCorsOriginAllowed(
        "https://todo.example.com",
        "todo.example.com",
        defaultAllowed,
      ),
    ).toBe(true);
  });

  it("allows explicitly configured origins and blocks untrusted cross-origin requests", () => {
    expect(
      isCorsOriginAllowed(
        "http://localhost:5173",
        "localhost:3001",
        defaultAllowed,
      ),
    ).toBe(true);
    expect(
      isCorsOriginAllowed(
        "https://evil.example.com",
        "todo.example.com",
        defaultAllowed,
      ),
    ).toBe(false);
  });
});
