export type TicketExpiryState = "normal" | "dueSoon" | "overdue";

const DUE_SOON_WINDOW_MS = 1000 * 60 * 60 * 48;

function toTimeMs(value: number | Date) {
  return value instanceof Date ? value.getTime() : value;
}

export function getTicketExpiryState(
  expiryDate: string | Date,
  referenceTime: number | Date = Date.now(),
): TicketExpiryState {
  const expiryTime =
    expiryDate instanceof Date
      ? expiryDate.getTime()
      : new Date(expiryDate).getTime();
  const now = toTimeMs(referenceTime);

  if (expiryTime < now) {
    return "overdue";
  }

  if (expiryTime - now <= DUE_SOON_WINDOW_MS) {
    return "dueSoon";
  }

  return "normal";
}

export function getTicketExpiryLabel(
  expiryDate: string | Date,
  referenceTime: number | Date = Date.now(),
) {
  const state = getTicketExpiryState(expiryDate, referenceTime);

  return {
    overdue: "Overdue",
    dueSoon: "Due Soon",
    normal: "On Track",
  }[state];
}

export function getTicketExpiryBadgeClassName(state: TicketExpiryState) {
  return {
    overdue: "border-red-200 bg-red-50 text-red-700",
    dueSoon: "border-amber-200 bg-amber-50 text-amber-700",
    normal: "border-slate-200 bg-white text-slate-600",
  }[state];
}
