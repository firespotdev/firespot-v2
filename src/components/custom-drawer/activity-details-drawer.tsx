'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import {
  Share,
  RotateCcw,
  Heart,
  Copy,
  Check,
  MoreVertical,
  MoreHorizontal,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Button,
  TagFooter,
  CircularIconButton,
  showNotificationToast,
} from '../ui'
import { useDrawerStore } from '@/services/drawer'
import { CustomerSale } from '@/services/sales/interface'
import {
  useFavorites,
  useAddFavorite,
  useRemoveFavorite,
} from '@/services/favorites'
import { resolveSaleMerchant, saleItemCount } from '@/lib/utils/customer-sale'
import { formatCurrency } from '@/lib/utils'

interface ActivityDetailsDrawerProps {
  sale: CustomerSale
  closeDrawer: () => void
}

const VIA_LABELS: Record<string, string> = {
  'QR scan': 'QR code',
  'Link shared': 'Payment link',
  Manual: 'In person',
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-[14px] text-[#00000080] font-normal shrink-0">
        {label}
      </span>
      <span className="text-[14px] font-medium text-black text-right truncate">
        {children}
      </span>
    </div>
  )
}

export function ActivityDetailsDrawer({ sale }: ActivityDetailsDrawerProps) {
  const router = useRouter()
  const { openDrawer, closeDrawer, closeAllDrawers } = useDrawerStore()

  const merchant = resolveSaleMerchant(sale)
  const businessName = merchant.businessName || 'Merchant'
  const slug = merchant.merchantSlug

  const { data: favoritesData } = useFavorites()
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()

  const isFaved = useMemo(
    () =>
      Boolean(
        merchant.id &&
        favoritesData?.favorites?.some((f) => f.id === merchant.id),
      ),
    [favoritesData, merchant.id],
  )

  const amount = sale.amount || 0
  const itemCount = saleItemCount(sale)

  const formattedDate = useMemo(() => {
    const raw = sale.recordedAt || sale.createdAt
    if (!raw) return 'N/A'
    try {
      return format(new Date(raw), 'MMMM do, yyyy . h:mm a')
    } catch {
      return String(raw)
    }
  }, [sale])

  const viaLabel =
    (sale.source && VIA_LABELS[sale.source]) || sale.qrKitName || 'Firespot'
  const reference = sale.reference || sale._id?.substring(0, 10).toUpperCase()

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Firespot Receipt',
        text: `Payment of NGN ${formatCurrency(amount)} to ${businessName}`,
        url: window.location.href,
      })
    }
  }

  const handlePayAgain = () => {
    if (sale.serialNumber) {
      closeAllDrawers()
      router.push(`/pay/${sale.serialNumber}`)
    } else {
      showNotificationToast({ message: 'Coming soon' })
    }
  }

  const handleToggleFave = () => {
    if (!merchant.id) {
      showNotificationToast({ message: 'This business can’t be saved yet' })
      return
    }
    if (isFaved) {
      removeFavorite.mutate(merchant.id)
      showNotificationToast({
        message: `${businessName} removed from Faves`,
        mode: 'success',
      })
    } else {
      addFavorite.mutate(merchant.id)
      showNotificationToast({
        message: `${businessName} added to Faves`,
        mode: 'success',
      })
    }
  }

  const handleCopyReference = () => {
    if (reference) {
      navigator.clipboard.writeText(reference)
      showNotificationToast({ message: 'Reference copied', mode: 'success' })
    }
  }

  return (
    <div className="flex flex-col h-full font-satoshi bg-white">
      {/* Header */}
      <div className="shrink-0 p-3 border-b border-[#f1f1f1] w-full flex justify-between items-center bg-white">
        <CircularIconButton icon="arrow-left" size="sm" onClick={closeDrawer} />
        <h2 className="text-base font-bold text-black">Transaction details</h2>
        <CircularIconButton
          icon={<MoreHorizontal size={20} />}
          size="sm"
          onClick={() =>
            openDrawer({ type: 'activity-options', props: { sale } })
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center pt-8 px-4">
          {/* Merchant avatar */}
          <div className="w-20 h-20 rounded-full bg-[#E9EDF1] border border-[#F1F1F1] overflow-hidden flex items-center justify-center shrink-0">
            {merchant.profilePhotoUrl ? (
              <Image
                src={merchant.profilePhotoUrl}
                alt={businessName}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <Image
                src="/icons/store_solid.svg"
                width={28}
                height={28}
                alt="store"
              />
            )}
          </div>

          <h3 className="text-[20px] font-bold text-black -tracking-[0.4px] mt-4">
            {businessName}
          </h3>
          <p className="text-[14px] text-[#898A8D] font-medium text-center mt-1 px-6">
            NGN {formatCurrency(amount)} payment
            {slug ? ` to @${slug}` : ''} successful.
          </p>

          {/* Action buttons */}
          <div className="flex gap-2 justify-start w-full overflow-x-auto scrollbar-hide mt-5 mb-6 px-0.5">
            <Button
              variant="outline"
              onClick={handleShare}
              className="w-fit shrink-0 rounded-full h-9 bg-[#F1F1F1] border-none px-3.5 text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 flex items-center gap-1.5"
            >
              <Share size={16} className="text-black" />
              SHARE RECEIPT
            </Button>
            <Button
              variant="outline"
              onClick={handlePayAgain}
              className="w-fit shrink-0 rounded-full h-9 bg-[#F1F1F1] border-none px-3.5 text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 flex items-center gap-1.5"
            >
              <RotateCcw size={16} className="text-black" />
              PAY AGAIN
            </Button>
            <Button
              variant="outline"
              onClick={handleToggleFave}
              className="w-fit shrink-0 rounded-full h-9 bg-[#F1F1F1] border-none px-3.5 text-[10px] font-bold text-black tracking-[1px] hover:bg-[#F1F1F1]/80 flex items-center gap-1.5"
            >
              <Heart
                size={16}
                className="text-black"
                fill={isFaved ? '#111827' : 'none'}
              />
              {isFaved ? 'IN FAVES' : 'ADD TO FAVES'}
            </Button>
          </div>

          {/* Card 1: status + amount */}
          <div className="w-full border border-[#F1F1F1] rounded-[12px] bg-white p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#F1F1F1] pb-4">
              <span className="text-[14px] text-[#00000080] font-normal">
                Status
              </span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-[#24C166] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3.5px]" />
                </div>
                <span className="text-[14px] font-medium text-[#24C166]">
                  Successful
                </span>
              </div>
            </div>
            <DetailRow label="Amount">NGN {formatCurrency(amount)}</DetailRow>
          </div>

          {/* Card 2: payment */}
          <div className="w-full border border-[#F1F1F1] rounded-[12px] bg-white p-5 space-y-4 mt-4">
            <p className="text-[11px] font-bold text-[#00000066] tracking-[1px]">
              PAYMENT
            </p>
            <DetailRow label="Paid to">{businessName}</DetailRow>
            {sale.location && (
              <DetailRow label="Location">{sale.location}</DetailRow>
            )}
            <DetailRow label="Description">
              {itemCount > 0
                ? `${itemCount} item${itemCount === 1 ? '' : 's'}`
                : sale.description || 'Payment'}
            </DetailRow>
            <DetailRow label="Via">{viaLabel}</DetailRow>
            {sale.paymentMethod && (
              <DetailRow label="Payment method">{sale.paymentMethod}</DetailRow>
            )}
            <DetailRow label="Date and time">{formattedDate}</DetailRow>
            <div className="flex justify-between items-center gap-4">
              <span className="text-[14px] text-[#00000080] font-normal shrink-0">
                Reference
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[14px] font-medium text-black truncate">
                  {reference || 'N/A'}
                </span>
                <button
                  onClick={handleCopyReference}
                  className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
                >
                  <Copy size={16} className="text-[#9CA3AF]" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: more */}
          {merchant.businessIndustry && (
            <div className="w-full border border-[#F1F1F1] rounded-[12px] bg-white p-5 space-y-4 mt-4">
              <p className="text-[11px] font-bold text-[#00000066] tracking-[1px]">
                MORE
              </p>
              <DetailRow label="Category">
                {merchant.businessIndustry}
              </DetailRow>
            </div>
          )}

          <TagFooter />
        </div>
      </div>
    </div>
  )
}
