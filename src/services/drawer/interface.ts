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

export type DrawerDirection = 'left' | 'right' | 'top' | 'bottom'

export interface DrawerConfig {
  type: DrawerContentType
  props?: Record<string, unknown>
  direction?: DrawerDirection
}

export interface DrawerState {
  isOpen: boolean
  config: DrawerConfig | null
  openDrawer: (config: DrawerConfig) => void
  closeDrawer: () => void
}
