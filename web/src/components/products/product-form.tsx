'use client'

import { type KeyboardEvent, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PenLine, Plus, Trash2, Upload } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  showNotificationToast,
} from '@/components/ui'
import {
  useCreateProduct,
  useProductCategories,
  useUpdateProduct,
} from '@/services/products/hooks'
import {
  type Product,
  type ProductOption,
  type VariantPriceOverride,
} from '@/services/products/productsApi'
import Image from 'next/image'
import { useDrawerStore } from '@/services/drawer'

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
const parseCurrency = (value: string) =>
  Number(value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '')) || 0
const formatPriceInput = (input: HTMLInputElement) => {
  const rawValue = input.value.replace(/,/g, '')
  const rawCaret = Math.max(
    0,
    input.value.slice(0, input.selectionStart ?? 0).replace(/,/g, '').length,
  )
  const decimalIndex = rawValue.indexOf('.')
  const hasDecimal = decimalIndex !== -1
  const wholeRaw = (hasDecimal ? rawValue.slice(0, decimalIndex) : rawValue)
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')

  if (!wholeRaw && !hasDecimal) return { value: '', caret: 0 }

  const whole = Number(wholeRaw || '0').toLocaleString('en-NG')
  const fractionRaw = hasDecimal
    ? rawValue.slice(decimalIndex + 1).replace(/\D/g, '').slice(0, 2)
    : ''
  const value = `${whole}.${fractionRaw.padEnd(2, '0')}`

  if (hasDecimal && rawCaret > decimalIndex) {
    const fractionDigitsBeforeCaret = rawValue
      .slice(decimalIndex + 1, rawCaret)
      .replace(/\D/g, '')
      .slice(0, 2).length
    return {
      value,
      caret: whole.length + 1 + fractionDigitsBeforeCaret,
    }
  }

  const wholeDigitsBeforeCaret = rawValue
    .slice(0, rawCaret)
    .replace(/\D/g, '').length
  let seenDigits = 0
  let caret = 0
  while (caret < whole.length && seenDigits < wholeDigitsBeforeCaret) {
    if (/\d/.test(whole[caret])) seenDigits += 1
    caret += 1
  }
  return { value, caret }
}
const handlePriceKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
  const input = event.currentTarget
  const decimalIndex = input.value.indexOf('.')

  if ((event.key === '.' || event.key === ',') && decimalIndex !== -1) {
    event.preventDefault()
    input.setSelectionRange(decimalIndex + 1, input.value.length)
    return
  }

  if (input.selectionStart !== input.selectionEnd || decimalIndex === -1) return

  const deletingDecimal =
    (event.key === 'Delete' && input.selectionStart === decimalIndex) ||
    (event.key === 'Backspace' && input.selectionStart === decimalIndex + 1)
  if (deletingDecimal) event.preventDefault()
}
const combinations = (options: ProductOption[]) =>
  options.length
    ? options.reduce<Array<Array<{ id: string; value: string }>>>(
        (all, option) =>
          all.flatMap((partial) =>
            option.values.map((value) => [...partial, value]),
          ),
        [[]],
      )
    : []

export function ProductForm({
  product,
  initialCategoryId,
  onBack,
  onSaved,
}: {
  product?: Product
  initialCategoryId?: string
  onBack: () => void
  onSaved: () => void
}) {
  const categories = useProductCategories()
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const { openDrawer } = useDrawerStore()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(product?.imageUrl || '')
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [categoryId, setCategoryId] = useState(
    typeof product?.categoryId === 'string'
      ? product.categoryId
      : product?.categoryId?._id || initialCategoryId || '',
  )
  const [price, setPrice] = useState(product ? money(product.price) : '0.00')
  const [options, setOptions] = useState<ProductOption[]>(
    product?.options || [],
  )
  const [overrides, setOverrides] = useState<VariantPriceOverride[]>(
    product?.variantPriceOverrides || [],
  )
  const [excludedVariantKeys, setExcludedVariantKeys] = useState<string[]>(
    product?.excludedVariantKeys || [],
  )
  const [focusedVariantKey, setFocusedVariantKey] = useState<string | null>(
    null,
  )
  const [variantDrafts, setVariantDrafts] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasCompleteOptionCombination =
    options.length > 0 &&
    options.every(
      (option) =>
        option.name.trim() &&
        option.values.length > 0 &&
        option.values.every((value) => value.value.trim()),
    )
  const variants = useMemo(
    () => (hasCompleteOptionCombination ? combinations(options) : []),
    [hasCompleteOptionCombination, options],
  )
  const saveOption = (savedOption: ProductOption) =>
    setOptions((current) => {
      const existing = current.some((option) => option.id === savedOption.id)
      return existing
        ? current.map((option) =>
            option.id === savedOption.id ? savedOption : option,
          )
        : [...current, savedOption]
    })
  const effectiveOverrides = overrides.filter((override) =>
    variants.some(
      (variant) =>
        variant.map((value) => value.id).join('|') === override.combinationKey,
    ),
  )
  const effectiveExcludedVariantKeys = excludedVariantKeys.filter((key) =>
    variants.some(
      (variant) => variant.map((value) => value.id).join('|') === key,
    ),
  )
  const setVariantPrice = (optionValueIds: string[], value: string) => {
    const combinationKey = optionValueIds.join('|')
    const parsed = parseCurrency(value)
    if (!Number.isFinite(parsed) || parsed === parseCurrency(price)) {
      setOverrides((current) =>
        current.filter(
          (override) => override.combinationKey !== combinationKey,
        ),
      )
      return
    }
    setOverrides((current) => [
      ...current.filter(
        (override) => override.combinationKey !== combinationKey,
      ),
      { combinationKey, optionValueIds, price: parsed },
    ])
  }
  const updatePrice = (input: HTMLInputElement) => {
    const formatted = formatPriceInput(input)
    setPrice(formatted.value)
    requestAnimationFrame(() => {
      const input = priceInputRef.current
      if (!input) return
      input.setSelectionRange(formatted.caret, formatted.caret)
    })
  }
  const updateVariantPrice = (
    key: string,
    ids: string[],
    input: HTMLInputElement,
  ) => {
    const formatted = formatPriceInput(input)
    setVariantDrafts((current) => ({ ...current, [key]: formatted.value }))
    setVariantPrice(ids, formatted.value)
    requestAnimationFrame(() => {
      const input = document.activeElement
      if (!(input instanceof HTMLInputElement)) return
      input.setSelectionRange(formatted.caret, formatted.caret)
    })
  }
  const removeOverride = (key: string) =>
    setOverrides((current) =>
      current.filter((override) => override.combinationKey !== key),
    )
  const excludeVariant = (key: string) => {
    setExcludedVariantKeys((current) => [...new Set([...current, key])])
    removeOverride(key)
  }
  const onImage = (file?: File) => {
    if (!file) return
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
  }
  const save = async () => {
    if (isSubmitting) return
    const basePrice = parseCurrency(price)
    if (
      !name.trim() ||
      !categoryId ||
      !Number.isFinite(basePrice) ||
      basePrice < 0
    ) {
      showNotificationToast({
        message: 'Add a name, category, and valid price.',
      })
      return
    }
    setIsSubmitting(true)
    const cleanOptions = options
      .map((option) => ({
        ...option,
        name: option.name.trim(),
        values: option.values
          .map((value) => ({ ...value, value: value.value.trim() }))
          .filter((value) => value.value),
      }))
      .filter((option) => option.name && option.values.length)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
        price: basePrice,
        options: cleanOptions,
        variantPriceOverrides: effectiveOverrides,
        excludedVariantKeys: effectiveExcludedVariantKeys,
      }
      await (product
        ? update.mutateAsync({ id: product._id, payload, image })
        : create.mutateAsync({ payload, image }))
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      showNotificationToast({
        message: product ? 'Product updated' : 'Product added',
        mode: 'success',
      })
      onSaved()
    } catch {
      showNotificationToast({ message: 'Could not save product. Try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }
  const saving = isSubmitting || create.isPending || update.isPending
  return (
    <div className="h-full min-h-0 bg-white">
      <div className="mx-auto flex h-full min-h-0 max-w-125 flex-col">
        <header className="flex items-center justify-between px-3 py-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="p-1.5"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[16px] font-bold">
            {product ? 'Edit product' : 'Add product'}
          </h1>
          <span className="w-8" />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-20 mt-2 scrollbar-hide">
          <div className="mb-6 flex flex-col items-center border-b border-[#F1F1F1] pb-6">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[12px] bg-[#E5E7EB]"
              aria-label="Choose product photo"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src="/images/product_avatar.png"
                  height={64}
                  width={64}
                  alt="product placeholder"
                />
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => onImage(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 flex items-center gap-2 rounded-full bg-[#F1F1F1] h-9 px-4 text-[10px] font-bold tracking-[1px]"
            >
              <Upload size={16} />
              {imagePreview ? 'CHANGE PHOTO' : 'UPLOAD PHOTO'}
            </button>
          </div>
          <section className="space-y-4 border-b border-[#F1F1F1] pb-6">
            <div>
              <h2 className="text-[16px] font-bold">Required</h2>
              <p className="mt-1 text-[14px] text-[#6B7280]">
                Be as descriptive as possible.
              </p>
            </div>
            <div>
              <Label>Product name</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="eg. Wellshire Farms, Turkey Sausage Kielbasa"
                maxLength={120}
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={160}
                className="min-h-30 w-full rounded-[12px] border border-[#D8DADF] p-3 text-base outline-none focus:border-[#0075FF] focus:ring-2 focus:ring-[#0075FF]/20"
              />
              <p className="mt-1 text-right leading-none text-xs text-[#545F6C]">
                {description.length}/160
              </p>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent>
                  {categories.data?.categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[16px]">
                  ₦
                </span>
                <Input
                  ref={priceInputRef}
                  value={price}
                  onFocus={() => setPrice('')}
                  onBlur={() => setPrice(money(parseCurrency(price)))}
                  onChange={(event) => updatePrice(event.currentTarget)}
                  onKeyDown={handlePriceKeyDown}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="pl-9 text-[16px]"
                />
              </div>
            </div>
          </section>
          <section className="py-6">
            <h2 className="text-[16px] font-bold">Options</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Create up to 3 different option sets for this product
            </p>
            <div className="mt-4 overflow-hidden rounded-[12px] border border-[#E8E9EC] shadow-[0px_4px_8px_0px_#0000000A]">
              {options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-3 border-b border-[#E8E9EC] px-4 py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold">{option.name}</p>
                    <p className="mt-0.75 truncate text-xs text-[#6B7280]">
                      {option.values.map((value) => value.value).join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openDrawer({
                        type: 'product-option-editor',
                        props: { option, onSave: saveOption },
                      })
                    }
                    aria-label={`Edit ${option.name}`}
                    className="rounded-[10px] bg-[#F1F1F1] p-2.5"
                  >
                    <PenLine size={16} />
                  </button>
                </div>
              ))}
              {options.length < 3 && (
                <button
                  type="button"
                  onClick={() =>
                    openDrawer({
                      type: 'product-option-editor',
                      props: { onSave: saveOption },
                    })
                  }
                  className="flex w-full items-center gap-3 h-11 px-4 text-left text-[#0075FF]"
                >
                  <Plus size={16} color="#0075FF" strokeWidth={3} />
                  <span className="font-medium text-sm">
                    {options.length
                      ? 'Add more options'
                      : 'Add options like size, color, flavor etc'}
                  </span>
                </button>
              )}
            </div>
          </section>
          {variants.length > 0 && (
            <section className="border-t border-[#F1F1F1] py-6">
              <h2 className="text-[16px] font-bold">Variants</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Set a different price for a specific variant.
              </p>
              <div className="mt-4 overflow-hidden rounded-[12px] border border-[#F1F1F1] shadow-[0px_4px_8px_0px_#0000000A]">
                {variants
                  .filter(
                    (variant) =>
                      !excludedVariantKeys.includes(
                        variant.map((value) => value.id).join('|'),
                      ),
                  )
                  .map((variant) => {
                    const ids = variant.map((value) => value.id)
                    const key = ids.join('|')
                    const override = overrides.find(
                      (item) => item.combinationKey === key,
                    )
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 border-b border-[#E8E9EC] p-3 last:border-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {variant.map((value) => value.value).join(' / ')}
                        </span>
                        <div className="relative w-36">
                          <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-sm text-foreground">
                            ₦
                          </span>
                          <Input
                            className="h-9 min-w-0 pl-6 text-sm"
                            inputMode="decimal"
                            value={
                              focusedVariantKey === key
                                ? variantDrafts[key] || ''
                                : money(override?.price ?? parseCurrency(price))
                            }
                            onFocus={() => {
                              setFocusedVariantKey(key)
                              setVariantDrafts((current) => ({
                                ...current,
                                [key]: '',
                              }))
                            }}
                            onBlur={() => {
                              setFocusedVariantKey(null)
                              setVariantDrafts((current) => {
                                const next = { ...current }
                                delete next[key]
                                return next
                              })
                            }}
                            onChange={(event) =>
                              updateVariantPrice(key, ids, event.currentTarget)
                            }
                            onKeyDown={handlePriceKeyDown}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => excludeVariant(key)}
                          aria-label={`Remove ${variant.map((value) => value.value).join(' / ')} variant`}
                          className="rounded-[10px] bg-[#F1F1F1] p-2.5"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  })}
              </div>
            </section>
          )}
        </main>
        <footer className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-125 justify-end gap-4 bg-white px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="ghost" onClick={onBack} className="h-10 w-auto px-4">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="h-10 w-auto px-7">
            {saving ? <Spinner /> : 'Save'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
