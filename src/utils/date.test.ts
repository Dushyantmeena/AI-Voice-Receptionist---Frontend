import { describe, expect, it } from "vitest";
import {
  addMinutes,
  addMinutesToTime,
  fromDateTimeInput,
  isToday,
  minutesBetween,
  toDateTimeInput,
} from "@/utils/date";

describe("toDateTimeInput", () => {
  it("formats an ISO timestamp for a datetime-local input", () => {
    const iso = new Date(2026, 9, 26, 14, 5).toISOString();
    expect(toDateTimeInput(iso)).toBe("2026-10-26T14:05");
  });

  it("returns an empty string for missing or invalid values", () => {
    expect(toDateTimeInput(null)).toBe("");
    expect(toDateTimeInput(undefined)).toBe("");
    expect(toDateTimeInput("not-a-date")).toBe("");
  });
});

describe("fromDateTimeInput", () => {
  it("round-trips a local datetime value through ISO", () => {
    const iso = fromDateTimeInput("2026-10-26T14:05");
    expect(toDateTimeInput(iso)).toBe("2026-10-26T14:05");
  });

  it("returns an empty string when the value is blank", () => {
    expect(fromDateTimeInput("")).toBe("");
  });
});

describe("addMinutes", () => {
  it("shifts an ISO timestamp by the given number of minutes", () => {
    expect(addMinutes("2026-10-26T09:00:00.000Z", 45)).toBe("2026-10-26T09:45:00.000Z");
  });

  it("returns an empty string for an invalid timestamp", () => {
    expect(addMinutes("nope", 30)).toBe("");
  });
});

describe("minutesBetween", () => {
  it("computes the duration between two timestamps", () => {
    expect(minutesBetween("2026-10-26T09:00:00.000Z", "2026-10-26T10:30:00.000Z")).toBe(90);
  });
});

describe("addMinutesToTime", () => {
  it("adds minutes to an HH:mm value", () => {
    expect(addMinutesToTime("09:00", 45)).toBe("09:45");
  });

  it("clamps at the end of the day", () => {
    expect(addMinutesToTime("23:30", 120)).toBe("23:59");
  });

  it("returns the original value when it cannot be parsed", () => {
    expect(addMinutesToTime("oops", 15)).toBe("oops");
  });
});

describe("isToday", () => {
  it("matches the current calendar day", () => {
    expect(isToday(new Date().toISOString())).toBe(true);
  });

  it("rejects other days and invalid input", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday.toISOString())).toBe(false);
    expect(isToday(null)).toBe(false);
    expect(isToday("nope")).toBe(false);
  });
});
