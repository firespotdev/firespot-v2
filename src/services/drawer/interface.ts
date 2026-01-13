export type DrawerContentType = 'bank-accounts' | 'custom'

export interface DrawerConfig {
  type: DrawerContentType
  props?: Record<string, unknown>
}

export interface DrawerState {
  isOpen: boolean
  config: DrawerConfig | null
  openDrawer: (config: DrawerConfig) => void
  closeDrawer: () => void
}
