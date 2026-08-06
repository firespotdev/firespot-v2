'use client'

import {
  ChevronRight,
  Copy,
  LogOut,
  Maximize2,
  Share,
  Volume2,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Image from 'next/image'
import Link from 'next/link'
import { logoutEverywhere } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { usePlanCatalog, type PlanTier } from '@/services/merchant-plans'
import { useUserQRKits } from '@/services/qr'
import { useUserProfile } from '@/services/users'
import { MerchantQuickActionsList } from '@/components/merchant/merchant-quick-actions'
import { TierIcon } from '@/components/merchant/tier-icon'
import { showNotificationToast, Switch } from '@/components/ui'
import { usePreference } from '@/hooks/usePreference'
import { cn } from '@/lib/utils'
import { ReactNode, useState } from 'react'
import {
  ArrowCircleDown2,
  BagTick,
  Bank,
  Box1,
  BoxAdd,
  Briefcase,
  Calendar1,
  CalendarTick,
  Clock,
  DeviceMessage,
  DocumentText,
  Graph,
  Location,
  MessageSearch,
  People,
  PercentageSquare,
  Profile2User,
  ReceiveSquare,
  Scan,
  Shop,
  Truck,
} from 'iconsax-reactjs'
import {
  GiftIcon,
  MonitorArrowUpIcon,
  TrendUpIcon,
} from '@phosphor-icons/react'

interface ProfileMenuDrawerProps {
  closeDrawer: () => void
}

type SidebarAudience = 'merchant' | 'personal'

interface SidebarMenuItem {
  label: string
  icon: ReactNode
  href?: string
  onClick?: () => void
  proGateLabel?: 'Available in' | 'Get started with'
}

interface BusinessMenuItem extends SidebarMenuItem {
  onClick?: () => void
}

interface SidebarMenuSection {
  items: SidebarMenuItem[]
}

const MERCHANT_MENU_SECTIONS: SidebarMenuSection[] = [
  {
    items: [
      {
        label: 'New sale',
        icon: <ReceiveSquare size={24} />,
        // Recording a sale is a bottom sheet, not a route.
        onClick: () => {
          const { closeDrawer, openDrawer } = useDrawerStore.getState()
          closeDrawer('profile-menu')
          openDrawer({ type: 'record-sale' })
        },
      },
      {
        label: 'New expense',
        icon: (
          <Image
            src="/icons/send-square.svg"
            height={24}
            width={24}
            alt="send-square"
          />
        ),
      },
      { label: 'History', icon: <Clock size={24} />, href: '/history' },
      {
        label: 'Payouts',
        icon: <ArrowCircleDown2 size={24} />,
        href: '/payouts',
        proGateLabel: 'Available in',
      },
    ],
  },
  {
    items: [
      {
        label: 'Orders',
        icon: <BagTick size={24} />,
        proGateLabel: 'Available in',
      },
      {
        label: 'Bookings',
        icon: <CalendarTick size={24} />,
        proGateLabel: 'Available in',
      },
      {
        label: 'Customers',
        icon: <Profile2User size={24} />,
        href: '/customers',
      },
      { label: 'Messages', icon: <MessageSearch size={24} /> },
      {
        label: 'Feedback',
        icon: (
          <Image
            src="/icons/heart-tag.svg"
            height={24}
            width={24}
            alt="heart-tag"
          />
        ),
        href: '/feedback',
        proGateLabel: 'Available in',
      },
      {
        label: 'Events',
        icon: <Calendar1 size={24} />,
        proGateLabel: 'Available in',
      },
      { label: 'Posts', icon: <MonitorArrowUpIcon size={24} /> },
    ],
  },
  {
    items: [
      { label: 'Insights', icon: <Graph size={24} />, href: '/insights' },
      {
        label: 'Sales Boost',
        icon: <TrendUpIcon size={24} />,
        proGateLabel: 'Get started with',
      },
    ],
  },
]

// Both audiences intentionally share one menu today. Keeping the lookup
// role-aware means personal navigation can diverge later without replacing
// the drawer registration or its common shell.
const MENU_SECTIONS_BY_AUDIENCE: Record<SidebarAudience, SidebarMenuSection[]> =
  {
    merchant: MERCHANT_MENU_SECTIONS,
    personal: MERCHANT_MENU_SECTIONS,
  }

const PLAN_LABELS: Record<PlanTier, string> = {
  LITE: 'LITE',
  PRO: 'PRO',
  PROMAX: 'PRO MAX',
}

const NEXT_PLAN_TIER: Partial<Record<PlanTier, PlanTier>> = {
  LITE: 'PRO',
  PRO: 'PROMAX',
}

const GRADIENT_TEXT_CLASS =
  'bg-linear-to-br from-[#FB5012] to-[#D72483] bg-clip-text text-transparent'

interface MenuRowProps extends SidebarMenuItem {
  closeDrawer: () => void
  hasProAccess: boolean
  isOpen?: boolean
}

function PlanBadge({ label = 'PRO' }: { label?: string }) {
  return (
    <span className="rounded-[4px] bg-[#9CA3AF] px-1 py-0.5 text-[11px] font-bold leading-none text-white">
      {label}
    </span>
  )
}

function ProGradientBadge({ label = 'PRO' }: { label?: string }) {
  return (
    <span className="rounded-[4px] bg-linear-to-br from-[#FB5012] to-[#D72483] px-1 py-0.5 text-[11px] font-bold leading-none text-white">
      {label}
    </span>
  )
}

function HeaderPlanBadge({ label }: { label: string }) {
  return (
    <span className="rounded-[4px] border border-black p-0.5 text-[10px] font-bold leading-none text-black">
      {label}
    </span>
  )
}

function PlanBrandIcon({ tier }: { tier: PlanTier | null }) {
  if (tier) {
    return (
      <TierIcon
        tier={tier}
        size={24}
        className="overflow-hidden rounded-[8px]"
      />
    )
  }

  return (
    <Image src="/images/lite_logo.png" alt="Firespot" width={24} height={24} />
  )
}

function MenuRow({
  label,
  icon: Icon,
  href,
  onClick,
  proGateLabel,
  closeDrawer,
  hasProAccess,
  isOpen,
}: MenuRowProps) {
  const isPlanLocked = Boolean(proGateLabel) && !hasProAccess
  const destination = isPlanLocked ? '/plans' : href
  const isPromotional = proGateLabel === 'Get started with'

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        {Icon}
        <span className="truncate text-left text-base font-medium text-black">
          {label}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isPlanLocked && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-bold',
              isPromotional ? GRADIENT_TEXT_CLASS : 'text-[#9CA3AF]',
            )}
          >
            {proGateLabel}
            {isPromotional ? <ProGradientBadge /> : <PlanBadge />}
          </span>
        )}
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform duration-200 ease-out',
            isOpen && 'rotate-90',
            isPlanLocked && isPromotional ? 'text-[#F43F5E]' : 'text-[#A6ADB7]',
          )}
          strokeWidth={2.5}
        />
      </div>
    </>
  )

  const className =
    'flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3 border-b border-[#F1F1F1] last:border-b-0'

  if (destination) {
    return (
      <Link href={destination} onClick={closeDrawer} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

function MenuSection({
  section,
  closeDrawer,
  hasProAccess,
}: {
  section: SidebarMenuSection
  closeDrawer: () => void
  hasProAccess: boolean
}) {
  return (
    <div className="overflow-hidden rounded-[12px] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
      {section.items.map((item) => (
        <MenuRow
          key={item.label}
          {...item}
          closeDrawer={closeDrawer}
          hasProAccess={hasProAccess}
        />
      ))}
    </div>
  )
}

function BusinessMenuRow({
  label,
  icon: Icon,
  href,
  proGateLabel,
  closeDrawer,
  hasProAccess,
  onClick,
}: BusinessMenuItem & MenuRowProps) {
  const isPlanLocked = Boolean(proGateLabel) && !hasProAccess
  const destination = isPlanLocked ? '/plans' : href

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex shrink-0 items-center justify-center text-black">
          {Icon}
        </span>
        <span className="truncate text-left text-[16px] font-medium text-black">
          {label}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isPlanLocked && (
          <span className="flex items-center gap-1 text-[13px] font-bold text-[#9CA3AF]">
            {proGateLabel}
            <PlanBadge />
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-[#A6ADB7]" strokeWidth={2.5} />
      </div>
    </>
  )

  const className =
    'flex min-h-13 w-full items-center justify-between gap-3 border-b border-[#F1F1F1] px-4 py-3'

  if (destination) {
    return (
      <Link href={destination} onClick={closeDrawer} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

function ManageBusinessDropdown({
  closeDrawer,
  hasProAccess,
  onBankAccountsClick,
}: {
  closeDrawer: () => void
  hasProAccess: boolean
  onBankAccountsClick: () => void
}) {
  const items: BusinessMenuItem[] = [
    {
      label: 'Products',
      icon: <Box1 size={24} />,
      proGateLabel: 'Available in',
    },
    {
      label: 'Services',
      icon: <Briefcase size={24} />,
      proGateLabel: 'Available in',
    },
    {
      label: 'Suppliers',
      icon: <BoxAdd size={24} />,
      proGateLabel: 'Available in',
    },
    {
      label: 'Locations',
      icon: <Location size={24} />,
      href: '/settings/locations',
      proGateLabel: 'Available in',
    },
    {
      label: 'Delivery',
      icon: <Truck size={24} />,
      href: '/settings/fulfillment',
      proGateLabel: 'Available in',
    },
    {
      label: 'Employees',
      icon: <People size={24} />,
    },
    {
      label: 'Charges & Taxes',
      icon: <PercentageSquare size={24} />,
    },
    {
      label: 'Business Profile',
      icon: <Shop size={24} />,
      href: '/profile',
    },
    {
      label: 'Bank accounts',
      icon: <Bank size={24} />,
      onClick: onBankAccountsClick,
    },
    {
      label: 'QR kits',
      icon: <Scan size={24} />,
      href: '/qr-kits',
    },
  ]

  return (
    <div className="overflow-hidden rounded-b-[12px] bg-white">
      {items.map((item) => (
        <BusinessMenuRow
          key={item.label}
          {...item}
          closeDrawer={closeDrawer}
          hasProAccess={hasProAccess}
        />
      ))}
    </div>
  )
}

export function ProfileMenuDrawer({ closeDrawer }: ProfileMenuDrawerProps) {
  const { data: profile } = useUserProfile()
  const audience: SidebarAudience =
    profile?.role === 'customer' ? 'personal' : 'merchant'
  const merchantDataEnabled = Boolean(profile) && audience === 'merchant'
  const { data: qrKitsData } = useUserQRKits({
    enabled: merchantDataEnabled,
  })
  const { data: planCatalog } = usePlanCatalog(merchantDataEnabled)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const [soundEnabled, setSoundEnabled] = usePreference('soundEnabled', true)
  const [isManageBusinessOpen, setIsManageBusinessOpen] = useState(false)

  const planTier: PlanTier | null = planCatalog
    ? planCatalog.current.planTier
    : profile?.planTier || null
  const effectivePlanTier = planCatalog
    ? planCatalog.current.effectiveTier
    : planTier
  const hasProAccess =
    effectivePlanTier === 'PRO' || effectivePlanTier === 'PROMAX'
  const nextPlanTier = planTier ? NEXT_PLAN_TIER[planTier] : 'PRO'
  const planActionLabel = planTier ? 'Upgrade to' : 'Get started with'
  const menuSections = MENU_SECTIONS_BY_AUDIENCE[audience]

  const businessName =
    profile?.businessName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    'Your Business'

  const handleBankAccountsClick = () => {
    closeDrawer()
    setTimeout(() => {
      openDrawer({
        type: 'bank-accounts',
        props: { bankAccounts: profile?.bankAccounts || [] },
      })
    }, 300)
  }

  const handleSignOut = () => {
    closeDrawer()
    logoutEverywhere().finally(() => {
      window.location.href = '/'
    })
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${qrKitsData?.data?.[0]?.serialNumber || 'profile'}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    showNotificationToast({
      message: 'Link copied',
      mode: 'success',
    })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: businessName,
          text: `Check out ${businessName} on Firespot Lite!`,
          url: shareUrl,
        })
      } catch {
        // User cancelled or share failed.
      }
    } else {
      handleCopyLink()
    }
  }

  const handleRecommendBusiness = () => {
    const recommendBusinessProps = {
      businessName,
      profilePhotoUrl: profile?.profilePhotoUrl,
      referralCode: profile?.merchantReferralCode || undefined,
    }

    closeDrawer()
    setTimeout(() => {
      openDrawer({
        type: 'recommend-business',
        props: recommendBusinessProps,
      })
    }, 300)
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F4F6F8] font-satoshi">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-1">
          <PlanBrandIcon tier={planTier} />
          <span className="text-xl font-bold leading-none text-black">
            firespot
          </span>
          {planTier && <HeaderPlanBadge label={PLAN_LABELS[planTier]} />}
        </div>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close profile menu"
          className="flex items-center justify-center"
        >
          <X className="h-6 w-6 text-black" strokeWidth={2} />
        </button>
      </header>

      <div className="px-3">
        <Link
          href="/profile"
          onClick={closeDrawer}
          className="mb-3 flex w-full items-center gap-3 rounded-[12px] bg-white p-3 shadow-[0px_4px_8px_0px_#0000000A]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#CED7E1]">
            {profile?.profilePhotoUrl ? (
              <Image
                src={profile.profilePhotoUrl}
                alt="Profile"
                width={48}
                height={48}
                className="h-12 w-12 object-cover"
              />
            ) : (
              <Image
                src="/icons/store_solid.svg"
                alt="store icon"
                width={32}
                height={32}
              />
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-bold uppercase text-black">
              {businessName}
            </p>
            <p className="truncate text-xs font-medium text-[#00000066]">
              {profile?.bankAccounts?.length || 0} linked bank accounts ·{' '}
              {qrKitsData?.pagination?.total || 0} QR kits
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#BDBDBD]" />
        </Link>

        {/* Existing share card and actions intentionally remain unchanged. */}
        <div className="relative mb-3 flex items-center gap-4 overflow-hidden rounded-[12px] bg-white p-4 shadow-[0px_4px_8px_0px_#0000000A]">
          <div className="z-10 flex-1">
            <h3 className="mb-1 text-[16px] font-bold text-black">
              Share your FS profile
            </h3>
            <p className="mb-4 text-[13px] font-medium text-[#00000080]">
              Share across platforms or copy the link and share directly.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-[#F4F6F8] text-black transition-transform active:scale-95"
              >
                <Share className="h-4 w-4" />
              </button>
              <button
                onClick={handleCopyLink}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-[#F4F6F8] text-black transition-transform active:scale-95"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  closeDrawer()
                  openDrawer({
                    type: 'profile-share',
                    props: {
                      businessName,
                      profilePhotoUrl: profile?.profilePhotoUrl,
                      serialNumber: qrKitsData?.data?.[0]?.serialNumber,
                    },
                  })
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-[#F4F6F8] text-black transition-transform active:scale-95"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex h-[128px] w-[128px] shrink-0 items-center justify-center rounded-[6px] bg-linear-to-br from-[#FB5012] to-[#D72483] p-[1.5px]">
            <div className="relative flex h-full w-full items-center justify-center rounded-[6px] bg-white">
              <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                  <linearGradient
                    id="qr-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FB5012" />
                    <stop offset="100%" stopColor="#D72483" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="relative rounded-[10px] bg-white">
                <QRCodeSVG
                  value={shareUrl}
                  size={112}
                  level="L"
                  marginSize={0}
                  fgColor="url(#qr-gradient)"
                  imageSettings={{
                    src:
                      profile?.profilePhotoUrl || '/images/default_avatar.png',
                    x: undefined,
                    y: undefined,
                    height: 28,
                    width: 28,
                    excavate: true,
                  }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#CED7E1] shadow-sm">
                      {profile?.profilePhotoUrl ? (
                        <Image
                          src={profile.profilePhotoUrl}
                          alt="Profile"
                          width={30}
                          height={30}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src="/icons/store_solid.svg"
                          alt="store icon"
                          width={30}
                          height={30}
                        />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-[5.5px] border-2 border-[#F4F6F8] bg-white">
                      <Image
                        src="/images/firespot_logo.png"
                        alt="logo"
                        width={18}
                        height={18}
                        className="h-full w-full rounded-[4px] object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {merchantDataEnabled && (
          <MerchantQuickActionsList
            onNavigate={closeDrawer}
            className="mb-3"
          />
        )}

        <div className="space-y-3">
          {menuSections.map((section, index) => (
            <MenuSection
              key={index}
              section={section}
              closeDrawer={closeDrawer}
              hasProAccess={hasProAccess}
            />
          ))}

          <div className="overflow-hidden rounded-[12px] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
            <Link
              href="/plans"
              onClick={closeDrawer}
              className="flex min-h-13 w-full items-center justify-between gap-3 border-b border-[#F1F1F1] px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <PlanBrandIcon tier={planTier} />
                <div className="flex items-center">
                  <span className="text-base font-medium text-black mr-1">
                    Your plan
                  </span>
                  {planTier && (
                    <span className="rounded-[4px] border border-black p-0.5 text-[10px] font-bold leading-none text-black">
                      {PLAN_LABELS[planTier]}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={cn(
                  'flex shrink-0 items-center gap-1.5 text-xs font-bold',
                  nextPlanTier && GRADIENT_TEXT_CLASS,
                )}
              >
                {nextPlanTier && (
                  <>
                    {planActionLabel}
                    <ProGradientBadge label={PLAN_LABELS[nextPlanTier]} />
                  </>
                )}
                <ChevronRight
                  className="h-4 w-4 text-[#F43F5E]"
                  strokeWidth={2.5}
                />
              </div>
            </Link>

            <MenuRow
              label="Talk to support"
              icon={<DeviceMessage size={24} />}
              closeDrawer={closeDrawer}
              hasProAccess={hasProAccess}
            />
            <MenuRow
              label="Manage business"
              icon={<Shop size={24} />}
              closeDrawer={closeDrawer}
              hasProAccess={hasProAccess}
              isOpen={isManageBusinessOpen}
              onClick={() => setIsManageBusinessOpen((isOpen) => !isOpen)}
            />
            {isManageBusinessOpen && (
              <ManageBusinessDropdown
                closeDrawer={closeDrawer}
                hasProAccess={hasProAccess}
                onBankAccountsClick={handleBankAccountsClick}
              />
            )}
            <MenuRow
              label="Register your business"
              icon={<DocumentText size="24" />}
              closeDrawer={closeDrawer}
              hasProAccess={hasProAccess}
            />
            <MenuRow
              label="Recommend to a business"
              icon={<GiftIcon size={24} />}
              closeDrawer={closeDrawer}
              hasProAccess={hasProAccess}
              onClick={handleRecommendBusiness}
            />
          </div>

          {/* Existing sound preference retained. */}
          <div className="overflow-hidden rounded-[12px] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
            <div className="flex min-h-13 w-full items-center gap-3 px-4 py-2.5">
              <Volume2 className="h-6 w-6 text-black" strokeWidth={1.7} />
              <span className="flex-1 text-left text-base font-medium text-black">
                Play sound for pending sales
              </span>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
          </div>

          {/* Existing About Firespot row retained. */}
          <div className="overflow-hidden rounded-[12px] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
            <button
              type="button"
              className="flex min-h-13 w-full items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Image
                  src="/images/lite_logo.png"
                  alt="Firespot"
                  width={24}
                  height={24}
                  className="object-cover"
                />
                <span className="text-left text-base font-medium text-black">
                  About Firespot
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#BDBDBD]" />
            </button>
          </div>

          <div className="mb-7 overflow-hidden rounded-[12px] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-13 w-full items-center gap-3 px-4 py-3 text-[#FF002E]"
            >
              <LogOut className="h-6 w-6" strokeWidth={1.7} />
              <span className="flex-1 text-left text-base font-medium">
                Sign out
              </span>
              <ChevronRight className="h-4 w-4 text-[#BDBDBD]" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  )
}
