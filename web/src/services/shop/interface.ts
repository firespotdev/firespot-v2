import type {
  ActiveHoursSetup,
  EmployeeSetup,
  ShopFulfillment,
  ShopMainAddress,
  ShopPolicies,
  ShopSocialLinks,
} from '../auth/interface'

/** One row of the shop-setup checklist, as computed by the server. */
export interface ShopSetupItem {
  key: ShopSetupKey
  done: boolean
  /** Undesigned items are shown but not yet actionable, and not counted. */
  locked: boolean
}

export type ShopSetupKey =
  // actionable
  | 'about'
  | 'bank'
  | 'verify'
  | 'contact'
  | 'fulfillment'
  | 'locations'
  | 'employees'
  | 'policies'
  | 'operatingHours'
  | 'firstItem'
  | 'qrKit'
  // locked / coming soon
  | 'bookings'
  | 'charges'
  | 'suppliers'

export interface ShopSetupResponse {
  items: ShopSetupItem[]
  completedCount: number
  /** Total actionable items (locked ones excluded). */
  total: number
  isLive: boolean
}

export interface UpdateContactPayload {
  businessEmail?: string
  website?: string
  socialLinks?: ShopSocialLinks
}

export type UpdateFulfillmentPayload = ShopFulfillment

export interface UpdateLocationPayload extends ShopMainAddress {
  branchCount?: number
}

export type UpdateEmployeeSetupPayload = Omit<EmployeeSetup, 'configuredAt'>
export type UpdateShopPoliciesPayload = Omit<ShopPolicies, 'configuredAt'>
export type UpdateActiveHoursSetupPayload = Omit<
  ActiveHoursSetup,
  'configuredAt'
>

export interface GoLiveResponse {
  shopIsLive: boolean
  shopWentLiveAt?: string
}
