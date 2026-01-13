import { create } from 'zustand'
import type { DrawerState, DrawerConfig } from './interface'

export const useDrawerStore = create<DrawerState>((set) => ({
  isOpen: false,
  config: null,
  openDrawer: (config) => set({ isOpen: true, config }),
  closeDrawer: () => set({ isOpen: false, config: null }),
}))

// Convenience hooks for specific drawer types
export const useOpenBankAccountsDrawer = () => {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  return (bankAccounts: unknown[]) =>
    openDrawer({ type: 'bank-accounts', props: { bankAccounts } })
}

export const useCloseDrawer = () => {
  return useDrawerStore((state) => state.closeDrawer)
}
