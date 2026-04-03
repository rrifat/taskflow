const UTC_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const UTC_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function getCurrentTimeMs() {
  return Date.now();
}

export function formatUtcDate(value: string | Date) {
  return UTC_DATE_FORMATTER.format(toDate(value));
}

export function formatUtcTimestamp(value: string | Date) {
  return UTC_TIMESTAMP_FORMATTER.format(toDate(value));
}

export function getIsoDateDaysFromNow(referenceTimeMs: number, days: number) {
  const date = new Date(referenceTimeMs);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
