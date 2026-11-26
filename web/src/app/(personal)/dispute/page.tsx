'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import { Button, LoaderCircle } from '@/components/ui'
import { useSafeBack } from '@/hooks/use-safe-back'
import { ReportResolved } from '@/components/personal/report/report-resolved'
import { ReportStatus } from '@/components/personal/report/report-status'
import { useReport } from '@/services/reports'

function DisputeContent() {
  const reportId = useSearchParams().get('reportId') || ''
  const router = useRouter()
  const goBack = useSafeBack('/activity')
  const { data: report, isLoading } = useReport(reportId)

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F4F6F8]">
        <LoaderCircle />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F6F8] px-6 text-center font-satoshi">
        <h1 className="text-[20px] font-bold text-black">Dispute not found</h1>
        <p className="mt-1 text-sm font-medium text-[#00000080]">
          It may belong to another account.
        </p>
        <Button onClick={goBack} className="mt-6 w-auto px-8">
          Go back
        </Button>
      </div>
    )
  }

  if (report.status === 'resolved') {
    return (
      <ReportResolved
        report={report}
        onClose={() => router.replace('/activity')}
      />
    )
  }

  return <ReportStatus report={report} onBack={goBack} />
}

export default function DisputePage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#F4F6F8]" />}>
      <DisputeContent />
    </Suspense>
  )
}
