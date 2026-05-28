import { describe, expect, it } from "vitest";

import { sanitizeBaseUrl } from "@/lib/url";

describe("url helpers", () => {
  it("removes trailing slashes while preserving path", () => {
    expect(sanitizeBaseUrl("https://example.com///")).toBe(
      "https://example.com",
    );
    expect(sanitizeBaseUrl("https://example.com/api/v1/")).toBe(
      "https://example.com/api/v1",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeBaseUrl("  https://example.com/base/  ")).toBe(
      "https://example.com/base",
    );
  });
});
