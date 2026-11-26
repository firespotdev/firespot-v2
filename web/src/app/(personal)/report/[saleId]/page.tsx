'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import { Button, LoaderCircle } from '@/components/ui'
import { useSafeBack } from '@/hooks/use-safe-back'
import { ReportForm } from '@/components/personal/report/report-form'
import { ReportHeader } from '@/components/personal/report/report-header'
import { ReportSaleCard } from '@/components/personal/report/report-sale-card'
import { ReportSubmitted } from '@/components/personal/report/report-submitted'
import { useReportSaleContext } from '@/services/reports'

function Message({
  title,
  body,
  onBack,
}: {
  title: string
  body: string
  onBack: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F6F8] px-6 text-center font-satoshi">
      <h1 className="text-[20px] font-bold text-black">{title}</h1>
      <p className="mt-1 text-sm font-medium text-[#00000080]">{body}</p>
      <Button onClick={onBack} className="mt-6 w-auto px-8">
        Go back
      </Button>
    </div>
  )
}

export default function ReportIssuePage() {
  const saleId = useParams<{ saleId: string }>().saleId
  const router = useRouter()
  const goBack = useSafeBack('/activity')
  const context = useReportSaleContext(saleId)
  const [submittedId, setSubmittedId] = useState<string>()

  const openReportId = context.data?.openReport?._id
  const trackHref = (id: string) => `/dispute?reportId=${id}`

  // A sale with an open report goes straight to that report's progress.
  useEffect(() => {
    if (openReportId && !submittedId) router.replace(trackHref(openReportId))
  }, [openReportId, submittedId, router])

  if (context.isLoading || (openReportId && !submittedId)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F4F6F8]">
        <LoaderCircle />
      </div>
    )
  }

  if (!context.data) {
    return (
      <Message
        title="Transaction not found"
        body="Only payments you made while signed in can be reported."
        onBack={goBack}
      />
    )
  }

  const { sale, canReport } = context.data

  if (submittedId) {
    return (
      <ReportSubmitted
        shopName={sale.merchant.businessName || 'this shop'}
        onTrack={() => router.replace(trackHref(submittedId))}
        onHome={() => router.replace('/home')}
      />
    )
  }

  if (!canReport) {
    return (
      <Message
        title="This payment can't be reported"
        body="There is already an open report for this payment."
        onBack={goBack}
      />
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-125 bg-linear-to-b from-[#FFFFFF] to-[#F4F6F8]">
      <ReportHeader title="Report issue" onBack={goBack} />

      <main className="px-3 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <ReportSaleCard sale={sale} onOpen={goBack} />
        <ReportForm saleId={saleId} onSubmitted={setSubmittedId} />
      </main>
    </div>
  )
}
