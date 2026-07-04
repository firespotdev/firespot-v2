'use client'

import { useState } from 'react'
import { X, Search, ChevronRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCustomers } from '@/services/customers/hooks'
import { useDrawerStore } from '@/services/drawer'
import { MerchantAvatar } from '../layout/MerchantAvatar'

interface Props {
  onSelect: (customer: any) => void
  onBack?: () => void
}

export function CustomerSelectDrawer({ onSelect, onBack }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { data: customers = [] } = useCustomers()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  const handleOpenAddCustomer = () => {
    closeDrawer('customer-select')
    openDrawer({
      type: 'add-customer',
      props: {
        onSelect: (newCust: any) => {
          onSelect(newCust)
        },
        onBack: () => {
          openDrawer({
            type: 'customer-select',
            props: { onSelect, onBack },
          })
        },
      },
    })
  }

  const filtered = customers.filter(
    (c: any) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchQuery),
  )

  return (
    <div className="w-full flex flex-col font-satoshi px-3 overflow-y-auto max-w-125 mx-auto">
      <div className="flex flex-col gap-3 py-2">
        {/* Header */}
        <div className="flex justify-between items-center pb-1">
          <button
            onClick={onBack || closeDrawer}
            type="button"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center text-black cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>

          <h2 className="text-[16px] font-bold text-black flex-1 text-center">
            Who owes you?
          </h2>

          <button
            onClick={closeDrawer}
            type="button"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5 text-[#8E8E93]" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center bg-[#E6E8EB99] rounded-full px-3 py-2 border border-[#EBEBEB] focus-within:border-gray-300 transition-colors">
          <Search className="w-4 h-4 text-[#00000066] mr-2" />
          <input
            type="text"
            placeholder="Search customers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none text-black font-medium placeholder-[#00000066]"
          />
        </div>

        {/* Add new customer Card */}
        <button
          onClick={handleOpenAddCustomer}
          type="button"
          className="w-full flex items-center justify-between p-3 bg-white border border-[#F4F6F8] rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-linear-to-br from-[#FB5012] to-[#D72483] rounded-[10px] flex items-center justify-center text-white shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M17 21H7c-4 0-5-1-5-5V8c0-4 1-5 5-5h10c4 0 5 1 5 5v8c0 4-1 5-5 5ZM14 8h5M15 12h4M17 16h2"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 11.29a1.81 1.81 0 1 0 0-3.62 1.81 1.81 0 0 0 0 3.62ZM12 16.33a3.02 3.02 0 0 0-2.74-2.72 7.72 7.72 0 0 0-1.52 0A3.03 3.03 0 0 0 5 16.33"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-[#0F172A]">
                Add new customer
              </span>
              <span className="text-[12px] font-medium text-[#64748B]">
                Name & phone number
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#64748B]" />
        </button>

        {/* Informational Box */}
        <div className="bg-[#F4F4F4] border border-[#00000014] rounded-[12px] py-2.5 px-3 text-left">
          <p className="text-xs text-[#00000066] font-medium">
            A balance needs a name. Select the customer so you can collect the
            balance later.
          </p>
        </div>

        <div>
          <span className="text-[13px] text-[#00000066] font-medium text-left px-0.5 select-none shrink-0 mb-2 inline-block">
            {filtered.length} {filtered.length === 1 ? 'customer' : 'customers'}
          </span>

          {/* Customers List Box */}
          <div className="flex flex-col border border-[#F1F1F1] rounded-[12px] overflow-hidden bg-white max-h-[30vh] overflow-y-auto shadow-[0px_4px_8px_0px_#0000000A]">
            {filtered.map((cust: any, index: number) => {
              const isSelected = selectedCustomer?._id === cust._id
              return (
                <button
                  key={cust._id}
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(cust)
                    onSelect(cust)
                  }}
                  className={`w-full flex items-center justify-between p-3 transition-all text-left group cursor-pointer
                  ${index > 0 ? 'border-t border-[#EBEBEB]' : ''}
                  ${isSelected ? 'bg-gray-50/70' : 'bg-white hover:bg-gray-50/40'}
                `}
                >
                  <div className="flex items-center gap-3">
                    <MerchantAvatar />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-black leading-none">
                        {cust.name}
                      </span>
                      <span className="text-xs text-[#6B7280] font-medium mt-1">
                        {cust.phoneNumber}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-black transition-colors" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Continue button */}
        <Button
          onClick={() => {
            onSelect(selectedCustomer || null)
          }}
          className="w-full mb-3 mt-1 bg-black text-white hover:bg-black/90 font-bold transition-all h-14 rounded-full text-base active:scale-[0.98]"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
