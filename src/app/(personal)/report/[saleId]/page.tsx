'use client'

import { useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Landmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSale } from '@/services/sales/hooks'
import { useSubmitReport } from '@/services/reports/hooks'
import { showNotificationToast } from '@/components/ui'

const DISPUTE_CATEGORIES = [
  'Payment not credited to my bank',
  'Incorrect transaction amount charged',
  'Duplicate charge detected',
  'Other issues',
]

export default function DisputeReportPage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh bg-white flex items-center justify-center font-satoshi font-bold">
          Loading dispute form...
        </div>
      }
    >
      <DisputeReportPageContent />
    </Suspense>
  )
}

function DisputeReportPageContent() {
  const params = useParams()
  const router = useRouter()
  const saleId = params.saleId as string

  const { data: sale, isLoading } = useSale(saleId)
  const submitReportMutation = useSubmitReport()

  const [category, setCategory] = useState(DISPUTE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      alert('Please explain the dispute details')
      return
    }

    setIsSubmitting(true)
    submitReportMutation.mutate(
      {
        saleId,
        category,
        description,
        proof: proofFile || undefined,
      },
      {
        onSuccess: () => {
          setIsSubmitting(false)
          setIsSubmitted(true)
        },
        onError: (err: any) => {
          setIsSubmitting(false)
          alert(
            err?.response?.data?.message ||
              'Failed to submit report. Please try again.',
          )
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div className="h-dvh bg-white flex items-center justify-center font-satoshi">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="h-dvh bg-white flex flex-col items-center justify-center font-satoshi p-6 text-center">
        <Landmark className="w-12 h-12 text-[#FF3B30] mb-4" />
        <h2 className="text-lg font-bold text-black mb-1">
          Transaction Not Found
        </h2>
        <p className="text-sm text-[#00000060] mb-6">
          We could not find the sale you are trying to dispute.
        </p>
        <Button
          onClick={() => router.push('/activity')}
          className="rounded-full bg-black text-white h-11 px-8 font-bold"
        >
          Go back to history
        </Button>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="h-dvh bg-[#F4F6F8] flex items-center justify-center font-satoshi">
        <div className="w-full max-w-125 bg-white h-full flex flex-col p-6 items-center justify-center text-center shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-[#24C166] mb-6" />
          <h1 className="text-xl font-bold text-black mb-2">
            Dispute submitted
          </h1>
          <p className="text-sm text-[#00000060] font-medium leading-relaxed mb-10 max-w-xs">
            We have received your dispute request. Our customer support team
            will investigate and follow up with you.
          </p>
          <Button
            onClick={() => router.replace('/activity')}
            className="w-full h-12 bg-black text-white font-bold rounded-full"
          >
            Done
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh bg-[#F4F6F8] flex items-center justify-center font-satoshi">
      <div className="w-full max-w-125 bg-white h-full flex flex-col p-6 shadow-sm justify-between">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#F4F6F8] pb-3">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-gray-100 rounded-full transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          <h2 className="text-base font-bold text-black flex-1 text-center pr-6">
            Report dispute
          </h2>
        </div>

        {/* Content Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto pt-6 flex flex-col gap-6"
        >
          {/* Sale details summary card */}
          <div className="w-full bg-[#F4F6F8] rounded-[12px] p-4 text-left border border-[#E9EBED]">
            <span className="text-[10px] text-[#8E8E93] font-bold">
              DISPUTING TRANSACTION
            </span>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm font-bold text-black">
                {sale.merchantId?.businessName || 'Merchant'}
              </span>
              <span className="text-sm font-bold text-[#FF3B30]">
                ₦{sale.amount?.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-[#00000060] mt-1 italic">
              {sale.description || 'Firespot scan-to-pay transfer'}
            </p>
          </div>

          {/* Reason Select */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs text-[#8E8E93] font-bold">
              Reason for dispute
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border border-[#E9EBED] rounded-xl text-sm focus:outline-none focus:border-black bg-[#F4F6F8] font-medium text-black"
            >
              {DISPUTE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed explanation */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs text-[#8E8E93] font-bold">
              Dispute details
            </label>
            <textarea
              rows={4}
              placeholder="Please provide details of what happened (e.g. date of transfer, bank reference id, status on bank app etc.)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-[#E9EBED] rounded-xl text-sm focus:outline-none focus:border-black bg-[#F4F6F8] font-medium text-black placeholder:text-[#8E8E93] resize-none"
            />
          </div>

          {/* Screenshot upload dropzone */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs text-[#8E8E93] font-bold">
              Screenshot proof (optional)
            </label>
            <div className="w-full relative flex items-center justify-center p-6 border-2 border-dashed border-[#E9EBED] rounded-[12px] hover:bg-gray-50 transition-all cursor-pointer bg-[#F4F6F8]">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center text-center">
                <UploadCloud className="w-8 h-8 text-[#0085FF] mb-2" />
                <span className="text-sm font-bold text-black">
                  {proofFile ? proofFile.name : 'Tap to upload payment proof'}
                </span>
                <p className="text-xs text-[#00000040] mt-0.5">
                  PNG, JPG or WEBP image files
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-black text-white hover:bg-black/90 font-bold rounded-full mt-auto"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Submit dispute'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
