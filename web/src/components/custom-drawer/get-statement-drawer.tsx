'use client'

import { useState } from 'react'
import { endOfDay, format, startOfDay } from 'date-fns'
import { Calendar as CalendarIcon, Loader2, X } from 'lucide-react'
import { Calendar, Label, showNotificationToast } from '@/components/ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SalesApi } from '@/services/sales/salesApi'
import {
  downloadSalesStatement,
  type StatementFormat,
} from '@/lib/utils/statement-download'
import { cn } from '@/lib/utils'

interface GetStatementDrawerProps {
  closeDrawer: () => void
}

export function GetStatementDrawer({ closeDrawer }: GetStatementDrawerProps) {
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false)
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false)
  const [formatType, setFormatType] = useState<StatementFormat>('csv')
  const [isDownloading, setIsDownloading] = useState(false)

  const canDownload = Boolean(startDate && endDate) && !isDownloading

  const handleDownload = async () => {
    if (!startDate || !endDate || isDownloading) return

    setIsDownloading(true)
    try {
      const start = startOfDay(startDate)
      const end = endOfDay(endDate)
      const sales = await SalesApi.getStatementSales(
        start.toISOString(),
        end.toISOString(),
      )
      downloadSalesStatement(
        sales,
        formatType,
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd'),
      )
      closeDrawer()
    } catch {
      showNotificationToast({
        message: 'Your statement could not be downloaded. Please try again.',
        mode: 'error',
      })
      setIsDownloading(false)
    }
  }

  return (
    <form
      className="w-full rounded-[12px]"
      onSubmit={(event) => {
        event.preventDefault()
        void handleDownload()
      }}
    >
      <header className="flex justify-between items-center border-b border-[#EBEBEB] px-4 py-2">
        <div aria-hidden="true" className="w-9" />
        <h2 className="text-center text-[16px] font-bold text-black">
          Get statement
        </h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close statement drawer"
          className="flex size-9 items-center justify-center"
        >
          <X size={24} strokeWidth={2} />
        </button>
      </header>

      <div className="space-y-6 px-3 py-4">
        <fieldset>
          <Label>Choose a date range</Label>
          <div className="grid grid-cols-2 gap-3">
            <Popover
              open={isStartCalendarOpen}
              onOpenChange={setIsStartCalendarOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-between rounded-[8px] border border-[#DDDDDD] px-4 text-left text-base font-medium text-black outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span
                    className={cn(!startDate && 'text-[#9CA3AF] text-[14px]')}
                  >
                    {startDate ? format(startDate, 'MMM d, yyyy') : 'From'}
                  </span>
                  <CalendarIcon className="size-4 shrink-0 text-[#9CA3AF]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date)
                    if (date && endDate && endDate < date) setEndDate(undefined)
                    if (date) setIsStartCalendarOpen(false)
                  }}
                  disabled={{ after: new Date() }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover
              open={isEndCalendarOpen}
              onOpenChange={setIsEndCalendarOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={!startDate}
                  className="flex h-11 w-full items-center justify-between rounded-[8px] border border-[#DDDDDD] px-4 text-left text-base font-medium text-black outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    className={cn(!endDate && 'text-[#9CA3AF] text-[14px]')}
                  >
                    {endDate ? format(endDate, 'MMM d, yyyy') : 'To'}
                  </span>
                  <CalendarIcon className="size-4 shrink-0 text-[#9CA3AF]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date)
                    if (date) setIsEndCalendarOpen(false)
                  }}
                  disabled={(date) =>
                    date > new Date() || Boolean(startDate && date < startDate)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </fieldset>

        <fieldset>
          <Label>Format type</Label>
          <div className="grid grid-cols-2 gap-3">
            {(['csv', 'pdf'] as const).map((option) => {
              const selected = formatType === option
              return (
                <label
                  key={option}
                  className={cn(
                    'flex h-11 cursor-pointer items-center gap-3 rounded-[8px] border px-3 text-[14px] font-medium outline-none focus-within:ring-[3px] focus-within:ring-ring/50',
                    selected ? 'border-black' : 'border-[#CED7E1]',
                  )}
                >
                  <input
                    type="radio"
                    name="statement-format"
                    value={option}
                    checked={selected}
                    onChange={() => setFormatType(option)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-4 items-center justify-center rounded-full border-2',
                      selected ? 'border-black' : 'border-[#CED7E1]',
                    )}
                  >
                    {selected && (
                      <span className="size-2 rounded-full bg-black" />
                    )}
                  </span>
                  {option === 'csv' ? '.csv' : '.pdf'}
                </label>
              )
            })}
          </div>
        </fieldset>
      </div>

      <footer className="flex items-center justify-end gap-6 border-t border-[#EBEBEB] p-4">
        <button
          type="button"
          onClick={closeDrawer}
          className="h-11 px-2 text-base font-bold text-black"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canDownload}
          className="flex h-11 min-w-44 items-center justify-center gap-2 rounded-full bg-black px-5 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDownloading && <Loader2 size={16} className="animate-spin" />}
          {isDownloading ? 'Preparing…' : 'Download statement'}
        </button>
      </footer>
    </form>
  )
}
