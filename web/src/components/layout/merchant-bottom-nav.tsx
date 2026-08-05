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
const VISIBLE_ROUTES = ['/profile', '/history']

export function MerchantBottomNav() {
  const pathname = usePathname()
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  if (!VISIBLE_ROUTES.includes(pathname)) {
    return null
  }

  return (
    <nav
      aria-label="Merchant navigation"
      className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2"
    >
      <div className="glass-border flex gap-0.5 h-12 items-center justify-between rounded-full bg-white/80 backdrop-blur-sm p-1 shadow-[0px_4px_12px_0px_#00000014]">
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
            active && !isPrimary && 'bg-[#3333331A]',
            isPrimary && 'bg-black text-white',
          )
          const icon = (
            <Icon
              size={24}
              weight="regular"
              strokeWidth={3}
              className={isPrimary ? 'text-white' : 'text-[#00000066]'}
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
