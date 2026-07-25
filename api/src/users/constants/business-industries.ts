/**
 * Canonical list of business industries. The API validates merchant setup
 * against this list and serves it to clients via GET /users/industries —
 * update it here only.
 */
export const BUSINESS_INDUSTRIES = [
  "Food & Drinks",
  "Fashion & Apparel",
  "Beauty & Personal Care",
  "Electronics & Gadgets",
  "Groceries & Essentials",
  "Health & Pharmacy",
  "Home & Living",
  "Arts & Crafts",
  "Services",
  "Logistics & Transport",
  "Other",
] as const;

export type BusinessIndustry = (typeof BUSINESS_INDUSTRIES)[number];
