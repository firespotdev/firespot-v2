'use client'

import Link from 'next/link'
import { Button, EmptyState, LoaderCircle } from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import { Map1, Scan } from 'iconsax-reactjs'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useState } from 'react'

type ActivityTab = 'ALL' | 'SHOPS' | 'ITEMS' | 'POSTS' | 'EVENTS'
const TABS: ActivityTab[] = ['ALL', 'SHOPS', 'ITEMS', 'POSTS', 'EVENTS']

export default function SavedPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)
  const data = []

  const [activeTab, setActiveTab] = useState<ActivityTab>('ALL')

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="max-w-125 mx-auto min-h-dvh">
        <PageHeader
          title="Saved"
          logoSrc="/images/firespot_personal.png"
          className="bg-white"
          rightSlot={
            <button
              type="button"
              aria-label="search"
              className="w-9 h-9 flex justify-center items-center"
            >
              <MagnifyingGlassIcon size={20} strokeWidth={2} color="black" />
            </button>
          }
        />

        <div className="flex gap-2 px-3 pb-4 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const active = tab === activeTab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-4 h-9 rounded-full text-[10px] font-bold tracking-[1px] flex items-center transition-colors ${
                  active
                    ? 'bg-black text-white'
                    : 'bg-[#E5E7EB99] text-[#000000]'
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div className="frequent border-b border-[#f1f1f1] pb-16">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-black">Lists</h3>
            <Button
              variant="outline"
              className="w-fit border-none h-fit p-0 bg-transparent underline underline-offset-3 font-medium text-xs"
            >
              View all
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3 flex gap-3"></div>
        </div>

        <div className="h-[calc(100dvh-12rem)] flex flex-col justify-center items-center">
          {isLoading ? (
            <div className="flex justify-center">
              <LoaderCircle />
            </div>
          ) : isError ? (
            <div className="text-center">
              <p className="text-sm text-[#00000080] font-medium max-w-60">
                Couldn’t load your activity. Pull to refresh or try again later.
              </p>
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              emoji={
                <span
                  className="text-[64px] leading-none"
                  role="img"
                  aria-label="map"
                >
                  🗺️
                </span>
              }
              title="You haven't visited anywhere"
              details="Places you visit show here when you scan a Firespot QR code or visit a shop on the app."
              cta={
                <div className="flex items-center gap-3 mt-6">
                  <Link
                    href="/home"
                    className="inline-flex items-center gap-1 bg-black text-white text-[10px] font-bold tracking-[1px] rounded-full h-9 px-4"
                  >
                    <Map1 size={16} color="white" />
                    EXPLORE
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1 bg-[#F1F1F1] border border-[#DFDFDF80] text-black text-[10px] font-bold tracking-[1px] rounded-full h-9 px-4"
                  >
                    <Scan size={16} color="black" />
                    SCAN QR
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="px-4">
              <p className="text-center text-xs text-[#00000066] font-medium py-4">
                You’ve reached the end of the list
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
