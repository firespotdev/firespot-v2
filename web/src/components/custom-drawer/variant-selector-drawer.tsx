'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import type { Product, ProductOptionValue } from '@/services/products/productsApi'

interface Props { product: Product; onAdd: (variant: { label: string; values: Array<{ optionId: string; optionName: string; valueId: string; value: string }>; price: number }, quantity: number) => void }
const money = (value: number) => new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

export function VariantSelectorDrawer({ product, onAdd }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const [selected, setSelected] = useState<Record<string, ProductOptionValue>>(() => Object.fromEntries(product.options.map((option) => [option.id, option.values[0]])))
  const [quantity, setQuantity] = useState(1)
  const variant = useMemo(() => product.variants.find((entry) => entry.optionValueIds.every((id) => Object.values(selected).some((value) => value.id === id))), [product.variants, selected])
  const price = variant?.price ?? product.price
  return <div className="flex w-full max-w-125 flex-col bg-white p-6 font-satoshi"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Select a variant</h2><button type="button" onClick={closeDrawer} aria-label="Close" className="p-2"><X /></button></div><div className="mb-6 flex gap-3 rounded-[16px] border border-[#E9EBED] bg-[#F4F6F8] p-3"><div className="h-14 w-14 overflow-hidden rounded-[10px] bg-white">{product.imageUrl && <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />}</div><div><p className="font-bold">{product.name}</p><p className="mt-1 text-sm text-[#647084]">NGN {money(price)}</p></div></div><div className="space-y-5">{product.options.map((option) => <div key={option.id}><p className="mb-2 text-sm font-bold uppercase tracking-wide text-[#647084]">{option.name}</p><div className="flex flex-wrap gap-2">{option.values.map((value) => <button key={value.id} type="button" onClick={() => setSelected((current) => ({ ...current, [option.id]: value }))} className={`rounded-[12px] border px-4 py-2 text-sm font-bold ${selected[option.id]?.id === value.id ? 'border-black text-black' : 'border-[#E9EBED] text-[#647084]'}`}>{value.value}</button>)}</div></div>)}</div><div className="mt-7 flex items-center justify-between border-t border-[#F1F1F1] pt-4"><div className="flex h-12 items-center rounded-[12px] bg-[#F4F6F8]"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="p-3"><Minus size={16} /></button><span className="min-w-8 text-center font-bold">{quantity}</span><button type="button" onClick={() => setQuantity((value) => value + 1)} className="p-3"><Plus size={16} /></button></div><Button className="w-auto px-7" onClick={() => { onAdd({ label: variant?.label || '', values: product.options.map((option) => ({ optionId: option.id, optionName: option.name, valueId: selected[option.id].id, value: selected[option.id].value })), price }, quantity); closeDrawer() }}>Add to sale</Button></div></div>
}
