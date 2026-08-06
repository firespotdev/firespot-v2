'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChatsCircleIcon,
  ClockCounterClockwiseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  StorefrontIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useDrawerStore } from '@/services/drawer'

interface MerchantNavItem {
  key: 'shop' | 'search' | 'new-sale' | 'history' | 'messages'
  label: string
  href?: string
  Icon: typeof StorefrontIcon
}

const ITEMS: MerchantNavItem[] = [
  { key: 'shop', label: 'Shop', href: '/profile', Icon: StorefrontIcon },
  { key: 'search', label: 'Search', Icon: MagnifyingGlassIcon },
  // Recording a sale opens a bottom sheet over the current page.
  { key: 'new-sale', label: 'New sale', Icon: PlusIcon },
  {
    key: 'history',
    label: 'History',
    href: '/history',
    Icon: ClockCounterClockwiseIcon,
  },
  { key: 'messages', label: 'Messages', Icon: ChatsCircleIcon },
]

// The nav only shows on the pages it can navigate to. Add Search and Messages
// here once those destinations exist.
const VISIBLE_ROUTES = ['/profile', '/history', '/']

type MerchantBottomNavVariant = 'light' | 'dark'

interface MerchantBottomNavProps {
  variant?: MerchantBottomNavVariant
}

const VARIANTS: Record<
  MerchantBottomNavVariant,
  {
    container: string
    itemActive: string
    primaryButton: string
    primaryIcon: string
    iconActive: string
    iconInactive: string
  }
> = {
  light: {
    container: 'bg-white/80 backdrop-blur-sm shadow-[0px_4px_12px_0px_#00000014]',
    itemActive: 'bg-[#3333331A]',
    primaryButton: 'bg-black text-white',
    primaryIcon: 'text-white',
    iconActive: 'text-[#00000099]',
    iconInactive: 'text-[#00000066]',
  },
  dark: {
    container: 'bg-[#FFFFFF1A] backdrop-blur-lg',
    itemActive: 'bg-[#333333]',
    primaryButton: 'bg-white text-black',
    primaryIcon: 'text-black',
    iconActive: 'text-[#FFFFFF99]',
    iconInactive: 'text-[#FFFFFF99]',
  },
}

export function MerchantBottomNav({ variant = 'light' }: MerchantBottomNavProps) {
  const pathname = usePathname()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const styles = VARIANTS[variant]

  if (!VISIBLE_ROUTES.includes(pathname)) {
    return null
  }

  return (
    <nav
      aria-label="Merchant navigation"
      className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2"
    >
      <div
        className={cn(
          'glass-border flex gap-0.5 h-12 items-center justify-between rounded-full p-1',
          styles.container,
        )}
      >
        {ITEMS.map(({ key, label, href, Icon }) => {
          const active =
            href === '/profile'
              ? pathname === href
              : href
                ? pathname.startsWith(href)
                : false
          const isPrimary = key === 'new-sale'
          const className = cn(
            'flex h-full min-w-[63px] items-center justify-center rounded-full',
            active && !isPrimary && styles.itemActive,
            isPrimary && styles.primaryButton,
          )
          const icon = (
            <Icon
              size={24}
              weight="regular"
              strokeWidth={3}
              className={
                isPrimary
                  ? styles.primaryIcon
                  : active
                    ? styles.iconActive
                    : styles.iconInactive
              }
            />
          )

          if (!href) {
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                onClick={
                  isPrimary
                    ? () => openDrawer({ type: 'record-sale' })
                    : undefined
                }
                className={className}
              >
                {icon}
              </button>
            )
          }

          return (
            <Link
              key={key}
              href={href}
              aria-label={label}
              className={className}
            >
              {icon}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
