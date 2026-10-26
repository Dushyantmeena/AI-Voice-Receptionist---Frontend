import { describe, expect, it } from "vitest";
import {
  excerpt,
  formatClock,
  formatClockRange,
  formatCurrency,
  formatNumber,
  initialsOf,
  pluralize,
} from "@/utils/format";

describe("formatCurrency", () => {
  it("renders a decimal serialised as a string", () => {
    expect(formatCurrency("1500")).toBe("$1,500");
  });

  it("falls back to zero for unusable values", () => {
    expect(formatCurrency("not-a-number")).toBe("$0");
    expect(formatCurrency(null)).toBe("$0");
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(12345)).toBe("12,345");
    expect(formatNumber(undefined)).toBe("0");
  });
});

describe("pluralize", () => {
  it("uses the singular form for exactly one", () => {
    expect(pluralize(1, "business", "businesses")).toBe("1 business");
  });

  it("uses the plural form otherwise", () => {
    expect(pluralize(2, "business", "businesses")).toBe("2 businesses");
    expect(pluralize(0, "session")).toBe("0 sessions");
  });
});

describe("excerpt", () => {
  it("collapses whitespace and truncates long text", () => {
    expect(excerpt("  hello   world  ")).toBe("hello world");
    expect(excerpt("abcdefghij", 5)).toBe("abcd…");
  });

  it("returns an empty string when there is nothing to show", () => {
    expect(excerpt(null)).toBe("");
  });
});

describe("initialsOf", () => {
  it("combines the first and last name initials", () => {
    expect(initialsOf("Aarav Sharma")).toBe("AS");
    expect(initialsOf("Aarav")).toBe("A");
  });

  it("falls back to a question mark", () => {
    expect(initialsOf(null)).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("formatClock", () => {
  it("formats a 24h value as a 12h label", () => {
    expect(formatClock("09:05")).toBe("9:05 AM");
    expect(formatClock("13:30")).toBe("1:30 PM");
    expect(formatClock("00:00")).toBe("12:00 AM");
  });

  it("returns the input when it is not a time", () => {
    expect(formatClock("oops")).toBe("oops");
  });

  it("joins two values into a range", () => {
    expect(formatClockRange("09:00", "17:00")).toBe("9:00 AM – 5:00 PM");
  });
});
