import { create } from 'zustand'
import type { QRKit } from './interface'

interface QRBrandStore {
  selectedQRKit: QRKit | null
  originalSvg: string | null
  brandedSvg: string | null
  gradientStart: string
  gradientEnd: string
  logoUrl: string | null
  logoSize: number

  setSelectedQRKit: (qrKit: QRKit | null) => void
  setOriginalSvg: (svg: string | null) => void
  setBrandedSvg: (svg: string | null) => void
  setGradientStart: (color: string) => void
  setGradientEnd: (color: string) => void
  setLogoUrl: (url: string | null) => void
  setLogoSize: (size: number) => void
  reset: () => void
}

const defaultGradientStart = '#FB5012'
const defaultGradientEnd = '#D72483'

export const useQRBrandStore = create<QRBrandStore>((set) => ({
  selectedQRKit: null,
  originalSvg: null,
  brandedSvg: null,
  gradientStart: defaultGradientStart,
  gradientEnd: defaultGradientEnd,
  logoUrl: null,
  logoSize: 20,

  setSelectedQRKit: (qrKit) => set({ selectedQRKit: qrKit }),
  setOriginalSvg: (svg) => set({ originalSvg: svg }),
  setBrandedSvg: (svg) => set({ brandedSvg: svg }),
  setGradientStart: (color) => set({ gradientStart: color }),
  setGradientEnd: (color) => set({ gradientEnd: color }),
  setLogoUrl: (url) => set({ logoUrl: url }),
  setLogoSize: (size) => set({ logoSize: size }),
  reset: () =>
    set({
      selectedQRKit: null,
      originalSvg: null,
      brandedSvg: null,
      gradientStart: defaultGradientStart,
      gradientEnd: defaultGradientEnd,
      logoUrl: null,
      logoSize: 20,
    }),
}))
