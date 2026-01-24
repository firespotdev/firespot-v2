'use client'

import { Check, X } from 'lucide-react'
import {
  Drawer as DrawerPrimitive,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer'
import {
  useDrawerStore,
  type DrawerContentType,
  type DrawerDirection,
} from '@/services/drawer'
import { BankDrawer, BankDrawerHeaderLeft } from './bank-drawer'
import { ProfileMenuDrawer } from './profile-menu-drawer'
import { SelectBankDrawer } from './select-bank-drawer'
import { BankTransferDrawer } from './bank-transfer-drawer'
import { ReceiptDrawer } from './receipt-drawer'
import { DateRangeFilterDrawer } from './date-range-filter-drawer'

// Configuration for each drawer type
const DRAWER_CONFIG: Record<
  DrawerContentType,
  {
    title: string
    direction?: DrawerDirection
    HeaderLeft?: React.ComponentType
    Content: React.ComponentType<any>
    fullScreen?: boolean
  }
> = {
  'bank-accounts': {
    title: 'Bank accounts',
    HeaderLeft: BankDrawerHeaderLeft,
    Content: BankDrawer,
  },
  'profile-menu': {
    title: '',
    direction: 'left',
    fullScreen: true,
    Content: ProfileMenuDrawer,
  },
  'select-bank': {
    title: 'Transfer to',
    direction: 'bottom',
    Content: SelectBankDrawer,
  },
  'bank-transfer': {
    title: 'Send with bank app',
    direction: 'bottom',
    Content: BankTransferDrawer,
    fullScreen: true,
  },
  receipt: {
    title: 'Receipt',
    direction: 'right',
    fullScreen: true,
    Content: ReceiptDrawer,
  },
  'date-range-filter': {
    title: 'Filter',
    direction: 'bottom',
    Content: DateRangeFilterDrawer,
  },
  custom: {
    title: '',
    Content: () => null,
  },
}

export function CustomDrawer() {
  const { isOpen, config, closeDrawer } = useDrawerStore()

  if (!config) return null

  const drawerConfig = DRAWER_CONFIG[config.type]
  if (!drawerConfig) return null

  const { title, HeaderLeft, Content, direction, fullScreen } = drawerConfig
  const drawerDirection = config.direction || direction || 'bottom'

  // For full screen left/right drawers, render content directly without header
  if (
    fullScreen &&
    (drawerDirection === 'left' || drawerDirection === 'right')
  ) {
    return (
      <DrawerPrimitive
        open={isOpen}
        onOpenChange={(open) => !open && closeDrawer()}
        direction={drawerDirection}
      >
        <DrawerContent className="h-full w-full max-w-full bg-white">
          {/* Hidden title for accessibility */}
          <DrawerTitle className="sr-only">{title || 'Menu'}</DrawerTitle>
          <Content {...(config.props || {})} closeDrawer={closeDrawer} />
        </DrawerContent>
      </DrawerPrimitive>
    )
  }

  // For full screen bottom drawers, use near-full-screen height
  if (fullScreen && drawerDirection === 'bottom') {
    return (
      <DrawerPrimitive
        open={isOpen}
        onOpenChange={(open) => !open && closeDrawer()}
        direction={drawerDirection}
      >
        <DrawerContent className="max-w-[500px] mx-auto bg-white rounded-t-3xl data-[vaul-drawer-direction=bottom]:max-h-[95vh]">
          {/* Header */}
          <DrawerHeader className="flex flex-row items-center justify-between py-1.5 px-4">
            <div className="w-9 h-9 flex items-center justify-center">
              {HeaderLeft && <HeaderLeft />}
            </div>

            <DrawerTitle className="font-bold text-base text-black">
              <p className="text-[#00000080] text-xs font-medium text-center leading-none flex items-center justify-center gap-0.5">
                <Check size={16} color="#67CE67" />{' '}
                <span>Account number already copied!</span>
              </p>
              <h2 className="text-base font-bold text-black leading-none mt-1">
                Open your bank app and paste
              </h2>
            </DrawerTitle>

            <DrawerClose className="w-9 h-9 flex items-center justify-center">
              <X className="w-6 h-6 text-black" />
            </DrawerClose>
          </DrawerHeader>

          {/* Content */}
          <Content {...(config.props || {})} closeDrawer={closeDrawer} />
        </DrawerContent>
      </DrawerPrimitive>
    )
  }

  return (
    <DrawerPrimitive
      open={isOpen}
      onOpenChange={(open) => !open && closeDrawer()}
      direction={drawerDirection}
    >
      <DrawerContent className="max-h-[85vh] max-w-[500px] mx-auto bg-[#F4F6F8]">
        {/* Header */}
        <DrawerHeader className="flex flex-row items-center justify-between py-1.5 px-4">
          <div className="w-9 h-9 flex items-center justify-center">
            {HeaderLeft && <HeaderLeft />}
          </div>

          <DrawerTitle className="font-bold text-base text-black">
            {title}
          </DrawerTitle>

          <DrawerClose className="w-9 h-9 flex items-center justify-center">
            <X className="w-6 h-6 text-black" />
          </DrawerClose>
        </DrawerHeader>

        {/* Content */}
        <Content {...(config.props || {})} closeDrawer={closeDrawer} />
      </DrawerContent>
    </DrawerPrimitive>
  )
}
