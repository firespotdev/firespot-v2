'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import {
  HouseIcon,
  MagnifyingGlassIcon,
  BarcodeIcon,
  ClockCounterClockwiseIcon,
  ChatsCircleIcon,
} from '@phosphor-icons/react'

const NAV_ITEMS = [
  { key: 'home', Icon: HouseIcon, href: '/home', label: 'Home' },
  {
    key: 'search',
    Icon: MagnifyingGlassIcon,
    href: '/search',
    label: 'Search',
  },
  { key: 'scan', Icon: BarcodeIcon, href: '/', label: 'Scan' },
  {
    key: 'history',
    Icon: ClockCounterClockwiseIcon,
    href: '/activity',
    label: 'History',
  },
  { key: 'chat', Icon: ChatsCircleIcon, href: '#', label: 'Chat' },
] as const

type BottomNavVariant = 'light' | 'dark'

const VARIANTS: Record<
  BottomNavVariant,
  {
    container: string
    itemActive: string
    itemInactive: string
    iconActive: string
    iconInactive: string
  }
> = {
  light: {
    container: 'bg-[#F4F6F8] shadow-[0px_4px_8px_0px_#00000014]',
    itemActive: 'bg-[#3333331A]',
    itemInactive: 'bg-[#F4F6F8]',
    iconActive: '#00000099',
    iconInactive: '#00000066',
  },
  dark: {
    container: 'bg-[#FFFFFF1A] backdrop-blur-lg',
    itemActive: 'bg-[#333333]',
    itemInactive: 'bg-transparent',
    iconActive: '#FFFFFF99',
    iconInactive: '#FFFFFF99',
  },
}

interface BottomNavProps {
  variant?: BottomNavVariant
}

function comingSoon() {
  toast('Coming soon')
}

export function BottomNav({ variant = 'light' }: BottomNavProps) {
  const pathname = usePathname()
  const styles = VARIANTS[variant]

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[420px] z-50">
      <div
        className={`glass-border rounded-full h-12 flex items-center p-1 justify-between ${styles.container}`}
      >
        {NAV_ITEMS.map(({ key, Icon, href, label }) => {
          const active = href !== '#' && pathname === href
          const itemClassName = `${
            active ? styles.itemActive : styles.itemInactive
          } px-4 h-full flex justify-center items-center rounded-4xl min-w-[65px]`
          const icon = (
            <Icon
              size={24}
              color={active ? styles.iconActive : styles.iconInactive}
            />
          )

          if (href === '#') {
            return (
              <button
                key={key}
                type="button"
                onClick={comingSoon}
                aria-label={label}
                className={itemClassName}
              >
                {icon}
              </button>
            )
          }

          return (
            <Link key={key} href={href} className={itemClassName}>
              {icon}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
