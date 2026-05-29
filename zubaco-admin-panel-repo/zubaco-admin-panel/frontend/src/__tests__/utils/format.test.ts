import { formatDate, formatNumber, formatGrowth, capitalize } from "@/utils/format";

describe("formatDate", () => {
  it("formats a date string to readable format", () => {
    const result = formatDate("2024-11-15");
    expect(result).toMatch(/Nov/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });
});

describe("formatNumber", () => {
  it("formats numbers with commas", () => {
    expect(formatNumber(1284)).toBe("1,284");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("formats small numbers without commas", () => {
    expect(formatNumber(100)).toBe("100");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatGrowth", () => {
  it("adds + sign for positive growth", () => {
    expect(formatGrowth(12.3)).toBe("+12.3%");
  });

  it("does not add + sign for negative growth", () => {
    expect(formatGrowth(-5.5)).toBe("-5.5%");
  });

  it("handles zero growth", () => {
    expect(formatGrowth(0)).toBe("+0.0%");
  });

  it("formats with one decimal place", () => {
    expect(formatGrowth(8.7654)).toBe("+8.8%");
  });
});

describe("capitalize", () => {
  it("capitalizes the first letter", () => {
    expect(capitalize("puzzle")).toBe("Puzzle");
    expect(capitalize("action")).toBe("Action");
  });

  it("handles already capitalized strings", () => {
    expect(capitalize("Puzzle")).toBe("Puzzle");
  });

  it("handles single character", () => {
    expect(capitalize("a")).toBe("A");
  });
});
