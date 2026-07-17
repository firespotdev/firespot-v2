'use client'

import { useEffect, useRef } from 'react'
import { CircleCheck } from 'lucide-react'
import {
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Spinner,
} from '@/components/ui'
import { useBanks, useResolveAccount } from '@/services/paystack'

interface BusinessPaymentsFormProps {
  selectedBankCode: string
  selectedBankName: string
  onBankChange: (code: string, name: string) => void
  accountNumber: string
  onAccountNumberChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading?: boolean
  error?: string
  accountError?: string
  onAccountErrorChange: (error: string | undefined) => void
}

export function BusinessPaymentsForm({
  selectedBankCode,
  selectedBankName,
  onBankChange,
  accountNumber,
  onAccountNumberChange,
  onSubmit,
  isLoading = false,
  error,
  accountError,
  onAccountErrorChange,
}: BusinessPaymentsFormProps) {
  const { data: banks = [], isLoading: banksLoading } = useBanks()
  const resolveAccount = useResolveAccount()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const resolvedRef = useRef<string>('')

  // Auto-resolve account when account number is 10 digits and bank is selected
  useEffect(() => {
    const resolveKey = `${accountNumber}-${selectedBankCode}`

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (resolvedRef.current && resolvedRef.current !== resolveKey) {
      resolvedRef.current = ''
    }

    if (
      accountNumber.length === 10 &&
      selectedBankCode &&
      resolvedRef.current !== resolveKey
    ) {
      debounceTimerRef.current = setTimeout(() => {
        resolveAccount.mutate(
          {
            accountNumber,
            bankCode: selectedBankCode,
          },
          {
            onSuccess: () => {
              resolvedRef.current = resolveKey
              onAccountErrorChange(undefined)
            },
            onError: () => {
              resolvedRef.current = ''
              onAccountErrorChange('Unable to verify account number')
            },
          },
        )
      }, 500)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountNumber, selectedBankCode])

  const handleBankSelectChange = (value: string) => {
    const bank = banks.find((b) => b.code === value)
    if (bank) {
      onBankChange(bank.code, bank.name)
    } else {
      onBankChange('', '')
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col w-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <Label>Bank</Label>
            <Select
              value={selectedBankCode}
              onValueChange={handleBankSelectChange}
              disabled={banksLoading}
            >
              <SelectTrigger className="font-medium">
                <SelectValue
                  placeholder={
                    banksLoading ? 'Loading banks...' : 'Select a bank'
                  }
                >
                  {selectedBankName || 'Select a bank'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Account number</Label>
            <Input
              type="number"
              placeholder="Enter your account number"
              className={`w-full font-medium ${
                accountError
                  ? 'border-[#FF002E] focus-visible:border-[#FF002E] focus-visible:ring-[#FF002E]/20 focus-visible:ring-[3px]'
                  : ''
              }`}
              value={accountNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                onAccountNumberChange(value)
                if (accountError) {
                  onAccountErrorChange(undefined)
                }
              }}
            />

            {resolveAccount.isSuccess && (
              <div className="h-11 bg-[#E9F9F0] flex items-center gap-2 mt-2 rounded-[8px] px-4">
                <CircleCheck
                  className="w-5 h-5 text-[#ffffff]"
                  fill="#24C166"
                />
                <p className="text-sm text-[#24C166] font-medium">
                  {resolveAccount.data.accountName}
                </p>
              </div>
            )}

            {accountError && (
              <p className="text-[#FF002E] text-xs font-medium flex items-center gap-1 mt-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF002E] text-white text-xs flex items-center justify-center">
                  !
                </span>
                {accountError}
              </p>
            )}
          </div>
        </div>

        {error && !accountError && (
          <p className="text-[#FF002E] text-xs font-medium flex items-center gap-1 mt-4">
            <span className="w-3 h-3 rounded-full bg-[#FF002E] text-white text-xs flex items-center justify-center">
              !
            </span>
            {error}
          </p>
        )}
      </div>

      {/* Bottom-stuck footer: divider sits 16px above the button */}
      <div className="shrink-0 -mx-4 border-t border-[#F1F1F1] px-4 pt-4 bg-white rounded-t-[12px]">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner /> : 'Continue'}
        </Button>
      </div>
    </form>
  )
}
