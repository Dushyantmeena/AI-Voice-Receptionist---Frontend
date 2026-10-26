import type { DayOfWeek } from "@/types/domain";

/** Monday-first ordering used everywhere in the UI. */
export const DAY_ORDER: readonly DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Converts an ISO timestamp into the value an `<input type="datetime-local">`
 * expects. The backend stores UTC, the input works in local time.
 */
export function toDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Converts a `datetime-local` value back into the ISO string the API expects. */
export function fromDateTimeInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** Adds minutes to an ISO timestamp and returns a new ISO timestamp. */
export function addMinutes(iso: string, minutes: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

/** Adds minutes to a `HH:mm` string, clamping to 23:59. */
export function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(":");
  const hours = Number(parts[0] ?? 0);
  const mins = Number(parts[1] ?? 0);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return time;
  const total = Math.min(hours * 60 + mins + minutes, 23 * 60 + 59);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Duration in minutes between two ISO timestamps. */
export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

/** True when the ISO timestamp falls on the browser's current calendar day. */
export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
