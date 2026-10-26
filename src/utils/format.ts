/** ISO 4217 code quoted by the AI receptionist when it speaks about prices. */
export const CURRENCY_CODE = "USD";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: CURRENCY_CODE,
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a Prisma `Decimal` price. The backend serialises decimals as strings,
 * so a plain number arrives as `"1500"` and a monetary value as `"1500.5"`.
 */
export function formatCurrency(value: string | number | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(amount)) return currencyFormatter.format(0);
  return currencyFormatter.format(amount);
}

export function formatDateTime(iso: string | null | undefined, fallback = "—"): string {
  const date = parse(iso);
  return date ? dateTimeFormatter.format(date) : fallback;
}

export function formatDate(iso: string | null | undefined, fallback = "—"): string {
  const date = parse(iso);
  return date ? dateFormatter.format(date) : fallback;
}

export function formatTime(iso: string | null | undefined, fallback = "—"): string {
  const date = parse(iso);
  return date ? timeFormatter.format(date) : fallback;
}

export function formatDateTimeRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string {
  const start = parse(startIso);
  const end = parse(endIso);
  if (!start) return "—";
  if (!end) return dateTimeFormatter.format(start);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${dateTimeFormatter.format(start)} – ${timeFormatter.format(end)}`
    : `${dateTimeFormatter.format(start)} – ${dateTimeFormatter.format(end)}`;
}

/** "09:00" → "9:00 AM" for readability inside schedule tables. */
export function formatClock(time: string): string {
  const [hoursPart, minutesPart] = time.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

export function formatClockRange(start: string, end: string): string {
  return `${formatClock(start)} – ${formatClock(end)}`;
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function formatRelative(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return "—";
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const abs = Math.abs(diffMinutes);
  if (abs < 1) return "just now";
  if (abs < 60) return formatter.format(diffMinutes, "minute");
  if (abs < 60 * 24) return formatter.format(Math.round(diffMinutes / 60), "hour");
  if (abs < 60 * 24 * 30) return formatter.format(Math.round(diffMinutes / (60 * 24)), "day");
  return formatter.format(Math.round(diffMinutes / (60 * 24 * 30)), "month");
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

/** Trims a long transcript into a single preview line. */
export function excerpt(text: string | null | undefined, max = 140): string {
  if (!text) return "";
  const single = text.replace(/\s+/g, " ").trim();
  return single.length > max ? `${single.slice(0, max - 1)}…` : single;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
