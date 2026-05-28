import { afterEach, describe, expect, it, vi } from "vitest";

import { clearLegacyUrlSearchParams } from "@/utils/clear-legacy-url-search-params";

describe("clearLegacyUrlSearchParams", () => {
  const replaceState = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
    replaceState.mockReset();
  });

  it("is a no-op on the server", () => {
    expect(clearLegacyUrlSearchParams()).toBe(false);
  });

  it("removes legacy stage-id params and keeps other query keys", () => {
    vi.stubGlobal("window", {
      location: {
        href: "https://example.com/game?stage-id=abc&foo=bar#play",
      },
      history: { replaceState, state: null },
    });

    expect(clearLegacyUrlSearchParams()).toBe(true);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/game?foo=bar#play");
  });

  it("returns false when no legacy params are present", () => {
    vi.stubGlobal("window", {
      location: {
        href: "https://example.com/?foo=bar",
      },
      history: { replaceState, state: null },
    });

    expect(clearLegacyUrlSearchParams()).toBe(false);
    expect(replaceState).not.toHaveBeenCalled();
  });
});
