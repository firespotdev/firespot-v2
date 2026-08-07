export type DrawerContentType =
  | 'bank-accounts'
  | 'profile-menu'
  | 'personal-profile-menu'
  | 'select-bank'
  | 'bank-transfer'
  | 'share-transfer'
  | 'profile-share'
  | 'recommend-business'
  | 'recommend-business-sms'
  | 'day-time-editor'
  | 'active-hours-booking'
  | 'receipt'
  | 'date-range-filter'
  | 'custom'
  | 'payment-method'
  | 'record-success'
  | 'obtain-kit'
  | 'transaction-details'
  | 'checkout'
  | 'checkout-sale'
  | 'confirm-cancel'
  | 'variant-selector'
  | 'split-payment'
  | 'customer-select'
  | 'collect-payment'
  | 'transaction-options'
  | 'confirm-archive'
  | 'send-reminder'
  | 'repayment-summary'
  | 'repayment-success'
  | 'add-customer'
  | 'customer-sort'
  | 'account-switch'
  | 'sale-receipt'
  | 'activity-details'
  | 'activity-options'
  | 'verify-identity'
  | 'plan-checkout'
  | 'cancel-plan'
  | 'sale-items'
  | 'business-intro'
  | 'record-sale'



export type DrawerDirection = 'left' | 'right' | 'top' | 'bottom'

export interface DrawerConfig {
  type: DrawerContentType
  props?: Record<string, unknown>
  direction?: DrawerDirection
}

export interface DrawerState {
  isOpen: boolean
  config: DrawerConfig | null
  configs: DrawerConfig[]
  openDrawer: (config: DrawerConfig) => void
  closeDrawer: (type?: DrawerContentType | unknown) => void
  /**
   * Collapse the stack back down to `type`, leaving it mounted. Used by
   * surfaces that own a flow of nested drawers and hand live callbacks to
   * them — closing everything would unmount the owner mid-flow.
   */
  closeDrawersAbove: (type: DrawerContentType) => void
  closeAllDrawers: () => void
}
