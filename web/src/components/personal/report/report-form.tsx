'use client'

import { useRef, useState } from 'react'
import { ChevronDown, CircleAlert, Paperclip, Upload, X } from 'lucide-react'
import {
  Button,
  Label,
  Spinner,
  Textarea,
  showNotificationToast,
} from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import {
  REPORT_DESCRIPTION_MAX,
  type ReportCategory,
  reportCategoryLabel,
  useSubmitReport,
} from '@/services/reports'

const MAX_PROOF_BYTES = 10 * 1024 * 1024

const apiMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message

/** What went wrong, more detail and an optional photo, for one sale. */
export function ReportForm({
  saleId,
  onSubmitted,
}: {
  saleId: string
  onSubmitted: (reportId: string) => void
}) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const submit = useSubmitReport()
  const fileInput = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<ReportCategory>()
  const [description, setDescription] = useState('')
  const [proof, setProof] = useState<File>()

  const canSubmit = Boolean(category && description.trim()) && !submit.isPending

  const pickCategory = () =>
    openDrawer({
      type: 'report-category',
      props: { selected: category, onSelect: setCategory },
    })

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_PROOF_BYTES) {
      showNotificationToast({
        message: 'Choose a photo under 10 MB.',
        mode: 'error',
      })
      return
    }
    setProof(file)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!category || !canSubmit) return
    submit.mutate(
      { saleId, category, description: description.trim(), proof },
      {
        onSuccess: (report) => onSubmitted(report._id),
        onError: (error) =>
          showNotificationToast({
            message:
              apiMessage(error) ||
              'Could not submit your report. Please try again.',
            mode: 'error',
          }),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="mt-5">
        <Label htmlFor="report-category">What went wrong?</Label>
        {/* Opens the category drawer; styled like our Select trigger. */}
        <button
          id="report-category"
          type="button"
          onClick={pickCategory}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-[#DDDDDD] bg-transparent px-4 text-left text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
        >
          <span className={category ? 'text-black' : 'text-[#9CA3AF]'}>
            {category ? reportCategoryLabel(category) : 'Select one'}
          </span>
          <ChevronDown className="size-4 shrink-0 text-black" />
        </button>
      </div>

      <div className="mt-5">
        <Label htmlFor="report-description">Tell us more</Label>
        <Textarea
          id="report-description"
          maxLength={REPORT_DESCRIPTION_MAX}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe what happened..."
        />
        <p className="mt-1 text-right text-xs leading-none text-[#545F6C]">
          {description.length}/{REPORT_DESCRIPTION_MAX}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-[12px] bg-white px-2 py-4 shadow-[0px_0px_0px_1px_#E5E7EB]">
        <div className="w-9 h-9 flex items-center justify-center">
          <Paperclip size={20} className="shrink-0 text-[#6B7280]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-black">Add evidence</p>
          <p className="truncate text-[12px] font-medium text-[#6B7280]">
            {proof ? proof.name : 'Photo or screenshot (optional)'}
          </p>
        </div>
        {proof ? (
          <button
            type="button"
            onClick={() => setProof(undefined)}
            aria-label="Remove photo"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1F1F1]"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#0000000A] px-3.5 text-[10px] font-bold tracking-[1px] text-black"
          >
            <Upload size={16} strokeWidth={2} />
            UPLOAD
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-[#0000000A] bg-[#F4F4F4] p-3">
        <CircleAlert size={16} className="shrink-0 text-[#00000066]" />
        <p className="text-[12px] text-[#00000066] font-medium">
          Disputes are reviewed by Firespot. The merchant will be asked to
          provide evidence of fulfillment.
        </p>
      </div>

      <Button type="submit" disabled={!canSubmit} className="mt-5 h-12">
        {submit.isPending ? <Spinner /> : 'Submit report'}
      </Button>
    </form>
  )
}
