import { create } from 'zustand'
import type { DrawerState, DrawerConfig } from './interface'

export const useDrawerStore = create<DrawerState>((set) => ({
  isOpen: false,
  config: null,
  configs: [],
  openDrawer: (config) =>
    set((state) => {
      const existingIndex = state.configs.findIndex((c) => c.type === config.type)
      let newConfigs: DrawerConfig[]
      if (existingIndex !== -1) {
        newConfigs = [...state.configs.slice(0, existingIndex), config]
      } else {
        newConfigs = [...state.configs, config]
      }
      return {
        isOpen: true,
        config,
        configs: newConfigs,
      }
    }),
  closeDrawer: (type) =>
    set((state) => {
      let newConfigs: DrawerConfig[]
      if (typeof type === 'string') {
        newConfigs = state.configs.filter((c) => c.type !== type)
      } else {
        newConfigs = state.configs.slice(0, -1)
      }
      return {
        isOpen: newConfigs.length > 0,
        config: newConfigs[newConfigs.length - 1] || null,
        configs: newConfigs,
      }
    }),
  closeDrawersAbove: (type) =>
    set((state) => {
      const index = state.configs.findIndex((c) => c.type === type)
      if (index === -1) return state
      const configs = state.configs.slice(0, index + 1)
      return {
        isOpen: true,
        config: configs[configs.length - 1],
        configs,
      }
    }),
  closeAllDrawers: () =>
    set({
      isOpen: false,
      config: null,
      configs: [],
    }),
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
