'use client'

import Link from 'next/link'
import { EmptyState, LoaderCircle } from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import { Map1, Scan, Sort } from 'iconsax-reactjs'
import { useState } from 'react'

export default function PlacesPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)
  const data = []

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="max-w-125 mx-auto min-h-dvh">
        <PageHeader
          title="Places you've visited"
          logoSrc="/images/firespot_personal.png"
          className="bg-white"
          rightSlot={
            <button
              type="button"
              aria-label="Filter"
              className="w-9 h-9 flex justify-center items-center"
            >
              <Sort size={20} strokeWidth={2} color="black" />
            </button>
          }
        />

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
