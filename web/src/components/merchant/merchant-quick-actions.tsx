'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { ChevronRight, History } from 'lucide-react'
import { Graph, Moneys, Shop } from 'iconsax-reactjs'
import { IdentificationBadgeIcon } from '@phosphor-icons/react'
import { useSetupShopCta } from '@/components/merchant/setup-shop-cta'
import { cn } from '@/lib/utils'
import { useMerchantInsights } from '@/services/insights'
import { useOutstandingSummary, useSalesStats } from '@/services/sales/hooks'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export interface MerchantQuickAction {
  id: 'setup' | 'report' | 'recent' | 'outstanding'
  title: string
  subtitle: string
  href: string
  gradient: string
  icon: ReactNode
}

export function useMerchantQuickActions(): MerchantQuickAction[] {
  const yesterday = useMemo(() => subDays(new Date(), 1), [])
  const date = format(yesterday, 'yyyy-MM-dd')
  const { data: insights } = useMerchantInsights({
    preset: 'custom',
    startDate: date,
    endDate: date,
  })
  const { data: salesStats } = useSalesStats()
  const { data: outstanding } = useOutstandingSummary()
  const setupCta = useSetupShopCta()

  const pendingSalesCount = salesStats?.pendingSalesCount ?? 0
  const outstandingAmount = outstanding?.totalOutstandingAmount ?? 0
  const outstandingCustomerCount = outstanding?.customers?.length ?? 0

  const actions: MerchantQuickAction[] = []

  if (setupCta.show) {
    actions.push({
      id: 'setup',
      title: setupCta.title,
      subtitle: setupCta.subtitle,
      href: setupCta.href,
      gradient: setupCta.needsVerification
        ? 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)'
        : 'linear-gradient(135deg, #24C166 0%, #327D57 100%)',
      icon: setupCta.needsVerification ? (
        <IdentificationBadgeIcon size={24} weight="fill" color="white" />
      ) : (
        <Shop size={24} color="white" />
      ),
    })
  }

  actions.push({
    id: 'report',
    title: `${format(yesterday, 'EEEE')} report`,
    subtitle: `${insights?.traffic.totalCustomers ?? 0} customers visited yesterday`,
    href: '/insights',
    gradient: 'linear-gradient(91.94deg, #0075FF 1.65%, #26B2FF 100%)',
    icon: <Graph size={24} color="white" />,
  })

  if (pendingSalesCount > 0) {
    actions.push({
      id: 'recent',
      title: 'Recent sales',
      subtitle: `${pendingSalesCount} unconfirmed ${pendingSalesCount === 1 ? 'sale' : 'sales'}`,
      href: '/recents',
      gradient: 'linear-gradient(92.42deg, #6B4200 0%, #BB8123 100%)',
      icon: <History className="h-6 w-6 text-white" />,
    })
  }

  if (outstandingAmount > 0 && outstandingCustomerCount > 0) {
    actions.push({
      id: 'outstanding',
      title: `₦${new Intl.NumberFormat('en-NG', {
        maximumFractionDigits: 0,
      }).format(outstandingAmount)} outstanding`,
      subtitle: `${outstandingCustomerCount} ${outstandingCustomerCount === 1 ? 'customer' : 'customers'} to follow up`,
      href: '/outstanding',
      gradient: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
      icon: <Moneys size={24} color="white" />,
    })
  }

  return actions
}

export function MerchantQuickActionCard({
  action,
  onNavigate,
  className,
}: {
  action: MerchantQuickAction
  onNavigate?: () => void
  className?: string
}) {
  return (
    <Link
      href={action.href}
      onClick={onNavigate}
      className={cn(
        'relative flex w-full items-center gap-3 overflow-hidden rounded-[12px] border-[3px] border-[#FFFFFF99] p-3 shadow-[0px_4px_8px_0px_#0000000A]',
        className,
      )}
      style={{ background: action.gradient }}
    >
      <span className="absolute -bottom-4 left-5 flex h-[60px] w-[48px] -rotate-[9deg] items-start pt-[3%] justify-center rounded-[12px] border border-white/40 bg-white/20 shadow-[0px_4px_8px_0px_#00000014]">
        {action.icon}
      </span>
      <span className="min-w-0 flex-1 pl-[78px] text-left">
        <span className="block truncate text-sm font-bold text-white">
          {action.title}
        </span>
        <span className="block truncate text-[13px] font-medium text-white/90">
          {action.subtitle}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-white" />
    </Link>
  )
}

export function MerchantQuickActionsList({
  onNavigate,
  className,
}: {
  onNavigate?: () => void
  className?: string
}) {
  const actions = useMerchantQuickActions()

  return (
    <div className={cn('space-y-3', className)}>
      {actions.map((action) => (
        <MerchantQuickActionCard
          key={action.id}
          action={action}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}

export function MerchantQuickActionStack({
  className,
}: {
  className?: string
}) {
  const actions = useMerchantQuickActions()
  const [isOpen, setIsOpen] = useState(false)
  const report = actions.find((action) => action.id === 'report') ?? actions[0]
  const layers = actions
    .filter((action) => action.id !== report?.id)
    .slice(0, 3)

  if (!report) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="View merchant quick actions"
        className={cn('relative w-full pb-5', className)}
      >
        {layers.map((action, index) => (
          <span
            key={action.id}
            className="absolute h-[66px] rounded-[16px] border-[3px] border-[#FFFFFF99] shadow-[0px_4px_8px_0px_#0000000A]"
            style={{
              left: `${(index + 1) * 6}px`,
              right: `${(index + 1) * 6}px`,
              top: `${(index + 1) * 7}px`,
              zIndex: layers.length - index,
              background: action.gradient,
            }}
          />
        ))}
        <span
          className="relative z-10 flex w-full items-center gap-3 overflow-hidden rounded-[12px] border-[3px] border-[#FFFFFF99] p-3 shadow-[0px_4px_8px_0px_#0000000A]"
          style={{ background: report.gradient }}
        >
          <span className="absolute -bottom-4 left-5 flex h-[60px] w-[48px] -rotate-[9deg] items-start pt-[3%] justify-center rounded-[12px] border border-white/40 bg-white/20 shadow-[0px_4px_8px_0px_#00000014]">
            {report.icon}
          </span>
          <span className="min-w-0 flex-1 pl-[78px] text-left">
            <span className="block truncate text-sm font-bold text-white">
              {report.title}
            </span>
            <span className="block truncate text-[13px] font-medium text-white/90">
              {report.subtitle}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white" />
        </span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/20 backdrop-blur-[6px]"
          className="w-full max-w-125 gap-0 border-0 bg-transparent p-4 shadow-none"
        >
          <DialogTitle className="sr-only">Merchant quick actions</DialogTitle>
          <MerchantQuickActionsList onNavigate={() => setIsOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
