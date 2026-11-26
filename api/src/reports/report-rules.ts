/** What a customer can say went wrong with a sale. */
export const REPORT_CATEGORIES = {
  item_not_received: "Item not received",
  item_damaged: "Item arrived damaged",
  not_as_described: "Not as described",
  wrong_items: "Wrong items received",
  merchant_unresponsive: "Merchant unresponsive",
} as const;

export type ReportCategory = keyof typeof REPORT_CATEGORIES;
export const REPORT_CATEGORY_KEYS = Object.keys(
  REPORT_CATEGORIES,
) as ReportCategory[];

export const REPORT_STATUSES = [
  "pending",
  "in_review",
  "resolved",
  "closed",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const OPEN_REPORT_STATUSES: ReportStatus[] = ["pending", "in_review"];

export const REPORT_DECISIONS = ["customer", "merchant"] as const;
export type ReportDecision = (typeof REPORT_DECISIONS)[number];

export const REPORT_DESCRIPTION_MAX = 160;

const HOUR_MS = 60 * 60 * 1000;

/** A customer can nudge an open report once in this many hours. */
export const FOLLOW_UP_INTERVAL_HOURS = 24;

/** When the customer may follow up again, or null if they may now. */
export function nextFollowUpAt(
  followUps: Date[],
  now = new Date(),
): Date | null {
  const last = followUps[followUps.length - 1];
  if (!last) return null;
  const next = new Date(last.getTime() + FOLLOW_UP_INTERVAL_HOURS * HOUR_MS);
  return next.getTime() > now.getTime() ? next : null;
}

export function isOpenReport(status: string): boolean {
  return (OPEN_REPORT_STATUSES as string[]).includes(status);
}
