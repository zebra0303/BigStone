import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

// Mock the db module to avoid SQLite dependency in tests
vi.mock("../../db/database", () => ({
  default: {
    prepare: () => ({ get: () => null, all: () => [], run: () => ({}) }),
    exec: () => {},
    pragma: () => {},
  },
}));

// Import after mocking
import { requireAdmin } from "../auth";

const JWT_SECRET = process.env.JWT_SECRET || "dev_only_secret";

// Helper to create mock Express objects
function createMockReqRes(authHeader?: string) {
  const req = {
    headers: {
      authorization: authHeader,
    },
  } as any;

  const res = {
    statusCode: 200,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  } as any;

  const next = vi.fn();
  return { req, res, next };
}

describe("requireAdmin middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject request without authorization header", () => {
    const { req, res, next } = createMockReqRes();
    requireAdmin(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain("No token provided");
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject request without Bearer prefix", () => {
    const { req, res, next } = createMockReqRes("Token abc123");
    requireAdmin(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject invalid JWT token", () => {
    const { req, res, next } = createMockReqRes("Bearer invalid.token.here");
    requireAdmin(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain("Invalid or expired");
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject expired token", () => {
    const expiredToken = jwt.sign({ role: "admin" }, JWT_SECRET, {
      expiresIn: "0s",
    });
    const { req, res, next } = createMockReqRes(`Bearer ${expiredToken}`);

    // Small delay to ensure expiry
    requireAdmin(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should accept valid token and call next()", () => {
    const validToken = jwt.sign({ role: "admin" }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const { req, res, next } = createMockReqRes(`Bearer ${validToken}`);
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200); // unchanged
  });

  it("should reject token signed with wrong secret", () => {
    const wrongToken = jwt.sign({ role: "admin" }, "wrong_secret_key", {
      expiresIn: "1h",
    });
    const { req, res, next } = createMockReqRes(`Bearer ${wrongToken}`);
    requireAdmin(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
