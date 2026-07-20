'use client'

import { Suspense } from 'react'
import {
  AddressBookIcon,
  BarcodeIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import { ActionList, ActionListItem, AppCard, Button } from '@/components/ui'

function SearchPageContent() {
  return (
    <div className="min-h-dvh bg-[#F4F6F8]">
      <div className="max-w-125 mx-auto pb-28 px-3">
        <header className="flex py-2 gap-2 items-center w-full justify-between">
          <div className="relative z-20 w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <MagnifyingGlassIcon size={16} color="#00000033" />
            </div>
            <input
              type="text"
              placeholder="Search phone numbers, places or things"
              value={''}
              onChange={() => {}}
              className="w-full h-9 pl-8 pr-4 bg-[#E6E8EB99] border border-[#E5E7EB] -tracking-[0.2px] rounded-full text-sm font-medium placeholder:text-[#00000066] focus:outline-none focus:ring-2 focus:ring-[#0075FF]"
            />
          </div>
          <div className="bg-[#333333] min-w-9 h-9 border border-[#444444] rounded-full flex justify-center items-center">
            <BarcodeIcon color="white" size={16} />
          </div>
        </header>

        <div className="frequent border-b border-[#f1f1f1] pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-black">Frequent</h3>
            <Button
              variant="outline"
              className="w-fit border-none h-fit p-0 bg-transparent underline underline-offset-3 font-medium text-xs"
            >
              View all
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col justify-center items-center">
              <div className="border-[#D1D5DB] border-2 h-18 w-18 rounded-full mb-2 p-0.5"></div>
              <p className="font-medium text-xs text-black font-family-sofia-pro -tracking-[0.32]">
                Burger King
              </p>
            </div>
            <div className="flex flex-col justify-center items-center">
              <div className="border-[#D1D5DB] border-2 h-18 w-18 rounded-full mb-2 p-0.5"></div>
              <p className="font-medium text-xs text-black font-family-sofia-pro -tracking-[0.32]">
                Burger King
              </p>
            </div>
            <div className="flex flex-col justify-center items-center">
              <div className="border-[#D1D5DB] border-2 h-18 w-18 rounded-full mb-2 p-0.5"></div>
              <p className="font-medium text-xs text-black font-family-sofia-pro -tracking-[0.32]">
                Burger King
              </p>
            </div>
          </div>
        </div>

        <div className="recents border-b border-[#f1f1f1] py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-black">Recent</h3>
            <Button
              variant="outline"
              className="w-fit border-none h-fit p-0 bg-transparent underline underline-offset-3 font-medium text-xs"
            >
              View all
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col justify-center items-center">
              <div className="border-[#D1D5DB] border-2 h-18 w-18 rounded-full mb-2 p-0.5"></div>
              <p className="font-medium text-xs text-black font-family-sofia-pro -tracking-[0.32]">
                Honeydrop
              </p>
            </div>
            <div className="flex flex-col justify-center items-center">
              <div className="border-[#D1D5DB] border-2 h-18 w-18 rounded-full mb-2 p-0.5"></div>
              <p className="font-medium text-xs text-black font-family-sofia-pro -tracking-[0.32]">
                Honeydrop
              </p>
            </div>
            <div className="flex flex-col justify-center items-center">
              <div className="border-[#D1D5DB] border-2 h-18 w-18 rounded-full mb-2 p-0.5"></div>
              <p className="font-medium text-xs text-black font-family-sofia-pro -tracking-[0.32]">
                Omotola
              </p>
            </div>
          </div>
        </div>

        <div className="from_contacts">
          <h3 className="font-bold text-sm text-black mb-3 pt-4">
            From your contacts
          </h3>
          <ActionList rounded="12">
            <ActionListItem
              icon={
                <span className="w-12 h-12 rounded-full bg-[#0075FF] flex items-center justify-center overflow-hidden">
                  <AddressBookIcon size={24} color="white" />
                </span>
              }
              title={
                <span className="text-[14px] font-bold">Find contacts</span>
              }
              subtitle={
                <span className="text-[12px] font-medium text-[#00000080]">
                  Allow access to contacts
                </span>
              }
              className="px-3 py-2"
            />
          </ActionList>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <SearchPageContent />
    </Suspense>
  )
}
