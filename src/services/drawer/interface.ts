export type DrawerContentType =
  | 'bank-accounts'
  | 'profile-menu'
  | 'select-bank'
  | 'bank-transfer'
  | 'share-transfer'
  | 'profile-share'
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
  | 'customer-checkout'
  | 'transaction-options'
  | 'confirm-archive'
  | 'send-reminder'
  | 'repayment-summary'
  | 'repayment-success'
  | 'add-customer'
  | 'account-switch'
  | 'sale-receipt'
  | 'activity-details'
  | 'activity-options'
  | 'verify-identity'
  | 'plan-checkout'
  | 'cancel-plan'
  | 'sale-items'



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
  closeAllDrawers: () => void
}
