'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDrawerStore } from '@/services/drawer'

/**
 * Recording a sale is a bottom sheet ('record-sale' drawer), not a page. This
 * route only survives so cold loads — push notifications, bookmarks, shared
 * links — still land on the sheet: it hands the query params to the drawer and
 * drops the user on /recents underneath.
 */
export default function RecordSaleRoute() {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#F4F6F8]" />}>
      <RecordSaleRedirect />
    </Suspense>
  )
}

function RecordSaleRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const hasOpened = useRef(false)

  const editId = searchParams.get('id')
  const isEditMode = searchParams.get('edit') === 'true'
  const confirmId = searchParams.get('confirm')

  useEffect(() => {
    if (hasOpened.current) return
    hasOpened.current = true

    router.replace('/recents')
    openDrawer({
      type: 'record-sale',
      props: {
        ...(confirmId ? { confirmId } : {}),
        ...(isEditMode && editId ? { editId, isEditMode: true } : {}),
      },
    })
  }, [router, openDrawer, confirmId, editId, isEditMode])

  return <div className="h-dvh bg-[#F4F6F8]" />
}
