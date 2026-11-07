'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from '@bprogress/next/app'
import { Minus, Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showNotificationToast } from '@/components/ui'
import { useAddToPurchase } from '@/hooks/use-add-to-purchase'
import { useVariantSelection } from '@/hooks/use-variant-selection'
import {
  formatProductPrice,
  getProductPricing,
} from '@/lib/utils/product-pricing'
import type { PublicBusinessProfile } from '@/services/business-profile'
import type { Product } from '@/services/products/productsApi'
import { ItemBuyers } from './item-buyers'
import { ItemOptionPicker } from './item-option-picker'
import { AboutSeller, MoreFromSeller } from './item-seller'

function QuantityStepper({
  quantity,
  onChange,
}: {
  quantity: number
  onChange: (quantity: number) => void
}) {
  return (
    <div className="flex h-11 shrink-0 items-center rounded-full bg-[#F1F1F1]">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity === 1}
        aria-label="Decrease quantity"
        className="grid h-11 w-10 place-items-center disabled:opacity-40"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-6 text-center text-[16px] font-bold">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
        className="grid h-11 w-10 place-items-center"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

interface ItemDetailsProps {
  business: PublicBusinessProfile
  product: Product
  otherProducts: Product[]
  onDone: () => void
}

export function ItemDetails({
  business,
  product,
  otherProducts,
  onDone,
}: ItemDetailsProps) {
  const router = useRouter()
  const serialNumber = business.serialNumber
  const { addSelection, addToPurchase } = useAddToPurchase(serialNumber)
  const selection = useVariantSelection(product)
  const [quantity, setQuantity] = useState(1)

  const hasOptions = product.options.length > 0 && product.variants.length > 0
  const price = hasOptions ? selection.price : product.price
  // Same rule as the cards: no discount shown once options differ in price.
  const strikePrice = getProductPricing(product).compareAtPrice
  const canBuy = Boolean(serialNumber) && (!hasOptions || selection.variant)

  const addCurrentSelection = () =>
    addSelection(
      product,
      hasOptions ? selection.purchaseVariant : undefined,
      quantity,
    )

  const addToOrder = () => {
    addCurrentSelection()
    showNotificationToast({
      message: `${product.name} added to your order`,
      mode: 'success',
    })
    onDone()
  }

  const buyNow = () => {
    addCurrentSelection()
    router.push(`/pay/${serialNumber}?checkout=cart`)
  }

  return (
    <>
      <div className="relative aspect-square w-full bg-[#F4F6F8]">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 500px) 100vw, 500px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#9CA3AF]">
            <Package size={48} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="border-b border-[#F1F1F1] px-4 py-4">
        <h1 className="text-[18px] font-bold leading-snug text-black">
          {product.name}
        </h1>
        <p className="mt-1 flex items-baseline gap-2">
          {strikePrice !== null && (
            <span className="text-[16px] font-medium text-[#9CA3AF] line-through">
              ₦ {formatProductPrice(strikePrice)}
            </span>
          )}
          <span className="text-[18px] font-bold text-[#00BA55]">
            ₦ {formatProductPrice(price)}
          </span>
        </p>
      </div>

      <div className={serialNumber ? 'space-y-6 px-4 pt-4 pb-28' : 'space-y-6 p-4'}>
        {product.description && (
          <p className="text-[15px] font-medium leading-[1.5] text-[#6B7280]">
            {product.description}
          </p>
        )}

        <ItemBuyers
          businessId={business.id}
          productId={product._id}
          productName={product.name}
        />

        {hasOptions && (
          <ItemOptionPicker
            product={product}
            selected={selection.selected}
            isValueAvailable={selection.isValueAvailable}
            onSelect={selection.selectValue}
          />
        )}

        <AboutSeller business={business} />

        <MoreFromSeller
          businessId={business.id}
          products={otherProducts}
          onAdd={serialNumber ? (other) => addToPurchase(other) : undefined}
        />
      </div>

      {serialNumber && (
        <footer className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-125 items-center gap-2 border-t border-[#F1F1F1] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <QuantityStepper quantity={quantity} onChange={setQuantity} />
          <Button
            type="button"
            variant="secondary"
            onClick={addToOrder}
            disabled={!canBuy}
            className="h-11 flex-1 px-3"
          >
            Add to order
          </Button>
          <Button
            type="button"
            onClick={buyNow}
            disabled={!canBuy}
            className="h-11 flex-1 px-3"
          >
            Buy it now
          </Button>
        </footer>
      )}
    </>
  )
}
