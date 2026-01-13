'use client'

import { X } from 'lucide-react'
import {
  Drawer as DrawerPrimitive,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer'
import { useDrawerStore, type DrawerContentType } from '@/services/drawer'
import { BankDrawer, BankDrawerHeaderLeft } from './bank-drawer'

// Configuration for each drawer type
const DRAWER_CONFIG: Record<
  DrawerContentType,
  {
    title: string
    HeaderLeft?: React.ComponentType
    Content: React.ComponentType<any>
  }
> = {
  'bank-accounts': {
    title: 'Bank accounts',
    HeaderLeft: BankDrawerHeaderLeft,
    Content: BankDrawer,
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

  const { title, HeaderLeft, Content } = drawerConfig

  return (
    <DrawerPrimitive
      open={isOpen}
      onOpenChange={(open) => !open && closeDrawer()}
    >
      <DrawerContent className="max-h-[85vh] bg-[#F4F6F8]">
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
        <Content {...(config.props || {})} />
      </DrawerContent>
    </DrawerPrimitive>
  )
}
