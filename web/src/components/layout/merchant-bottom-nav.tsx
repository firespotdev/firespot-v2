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

interface MerchantNavItem {
  key: 'shop' | 'search' | 'new-sale' | 'recents' | 'messages'
  label: string
  href?: string
  Icon: typeof StorefrontIcon
}

const ITEMS: MerchantNavItem[] = [
  { key: 'shop', label: 'Shop', href: '/profile', Icon: StorefrontIcon },
  { key: 'search', label: 'Search', Icon: MagnifyingGlassIcon },
  { key: 'new-sale', label: 'New sale', href: '/record-sale', Icon: PlusIcon },
  {
    key: 'recents',
    label: 'Recents',
    href: '/recents',
    Icon: ClockCounterClockwiseIcon,
  },
  { key: 'messages', label: 'Messages', Icon: ChatsCircleIcon },
]

const HIDDEN_ROUTE_PREFIXES = [
  '/record-sale',
  '/record-repayment',
  '/verify',
  '/plans',
  '/shop-setup',
  '/settings/',
  '/bank-accounts/',
  '/qr-kits/',
]

export function MerchantBottomNav() {
  const pathname = usePathname()

  if (HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  return (
    <nav
      aria-label="Merchant navigation"
      className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2"
    >
      <div className="glass-border flex h-12 items-center justify-between rounded-full bg-white/10 p-1 shadow-[0px_4px_12px_0px_#00000014]">
        {ITEMS.map(({ key, label, href, Icon }) => {
          const active =
            href === '/profile'
              ? pathname === href
              : href
                ? pathname.startsWith(href)
                : false
          const isPrimary = key === 'new-sale'
          const className = cn(
            'flex h-full min-w-[67px] items-center justify-center rounded-full',
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
