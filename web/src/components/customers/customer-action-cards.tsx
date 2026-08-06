'use client'

import { ChevronRight } from 'lucide-react'
import { AddressBookIcon } from '@phosphor-icons/react'

interface CardProps {
  onClick: () => void
}

export function AddNewCustomerCard({ onClick }: CardProps) {
  return (
    <button
      onClick={onClick}
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
            Name &amp; phone number
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#64748B]" />
    </button>
  )
}

export function SyncContactsCard({
  onClick,
  title = 'Sync contacts',
}: CardProps & { title?: string }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="w-full flex items-center justify-between p-3 bg-white border border-[#F4F6F8] rounded-[12px] shadow-[0px_4px_8px_0px_#0000000A] text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#087CFF] text-white">
          <AddressBookIcon size={24} weight="fill" color="white" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm font-bold text-[#0F172A]">{title}</span>
          <span className="text-[12px] font-medium text-[#64748B]">
            See contacts already on firespot
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#64748B]" />
    </button>
  )
}
