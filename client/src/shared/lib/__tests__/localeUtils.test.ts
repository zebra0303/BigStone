import { describe, it, expect, vi } from "vitest";

// Mock i18next before importing
vi.mock("i18next", () => ({
  default: { language: "ko" },
}));

import { getDateLocale } from "../localeUtils";
import { ko, enUS } from "date-fns/locale";
import i18n from "i18next";

describe("getDateLocale", () => {
  it("should return Korean locale by default", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (i18n as any).language = "ko";
    expect(getDateLocale()).toBe(ko);
  });

  it("should return English locale for en", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (i18n as any).language = "en";
    expect(getDateLocale()).toBe(enUS);
  });

  it("should return English locale for en-US", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (i18n as any).language = "en-US";
    expect(getDateLocale()).toBe(enUS);
  });

  it("should return Korean locale for empty language", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (i18n as any).language = "";
    expect(getDateLocale()).toBe(ko);
  });
});
