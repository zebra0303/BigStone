import { describe, it, expect } from "vitest";
import { handleApiError, ApiError } from "../index";

describe("handleApiError", () => {
  it("should throw ApiError with message from data.error", async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad Request Error" }),
    } as unknown as Response;

    try {
      await handleApiError(mockResponse);
      // Fail test if error is not thrown
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).message).toBe("Bad Request Error");
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).details).toEqual({ error: "Bad Request Error" });
    }
  });

  it("should fallback to data.message if data.error is missing", async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized Access" }),
    } as unknown as Response;

    try {
      await handleApiError(mockResponse);
    } catch (e) {
      expect((e as ApiError).message).toBe("Unauthorized Access");
    }
  });

  it("should fallback to default message if no error field is found", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      json: async () => ({ somethingElse: "value" }),
    } as unknown as Response;

    try {
      await handleApiError(mockResponse, "Default API Error");
    } catch (e) {
      expect((e as ApiError).message).toBe("Default API Error");
    }
  });

  it("should handle non-JSON responses gracefully and use statusText", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => {
        throw new Error("SyntaxError: Unexpected token");
      },
    } as unknown as Response;

    try {
      await handleApiError(mockResponse, "Fetch Failed");
    } catch (e) {
      expect((e as ApiError).message).toBe("Fetch Failed: Not Found");
      expect((e as ApiError).status).toBe(404);
    }
  });
});
