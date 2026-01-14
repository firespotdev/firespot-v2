'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
  PhoneInput,
} from '@/components/ui'
import { useBanks, useResolveAccount } from '@/services/paystack'

interface SignupFormProps {
  phoneNumber: string
  onPhoneNumberChange: (value: string) => void
  selectedBankCode: string
  selectedBankName: string
  onBankChange: (code: string, name: string) => void
  accountNumber: string
  onAccountNumberChange: (value: string) => void
  referralCode: string
  onReferralCodeChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading?: boolean
  error?: string
}

export function SignupForm({
  phoneNumber,
  onPhoneNumberChange,
  selectedBankCode,
  selectedBankName,
  onBankChange,
  accountNumber,
  onAccountNumberChange,
  referralCode,
  onReferralCodeChange,
  onSubmit,
  isLoading = false,
  error,
}: SignupFormProps) {
  const { data: banks = [], isLoading: banksLoading } = useBanks()
  const resolveAccount = useResolveAccount()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const resolvedRef = useRef<string>('')

  // Auto-resolve account when account number is 10 digits and bank is selected
  useEffect(() => {
    // Create a unique key for this combination
    const resolveKey = `${accountNumber}-${selectedBankCode}`

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Reset resolved state if account number or bank changes to a different combination
    if (resolvedRef.current && resolvedRef.current !== resolveKey) {
      resolvedRef.current = ''
    }

    if (
      accountNumber.length === 10 &&
      selectedBankCode &&
      resolvedRef.current !== resolveKey
    ) {
      // Debounce the API call by 500ms
      debounceTimerRef.current = setTimeout(() => {
        resolveAccount.mutate(
          {
            accountNumber,
            bankCode: selectedBankCode,
          },
          {
            onSuccess: () => {
              // Mark this combination as resolved
              resolvedRef.current = resolveKey
            },
            onError: () => {
              // Clear on error so user can retry
              resolvedRef.current = ''
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
    // Find the bank by code (value is the bank code)
    const bank = banks.find((b) => b.code === value)
    if (bank) {
      onBankChange(bank.code, bank.name)
    } else {
      onBankChange('', '')
    }
  }

  return (
    <div className="h-screen bg-white">
      <div className="max-w-[500px] mx-auto h-full pt-8 pb-4 px-4 flex flex-col items-center font-satoshi">
        <Image
          src="/firespot_logo.svg"
          alt="firespot logo"
          width={48}
          height={48}
          className="mb-6"
        />
        <h1 className="font-bold text-xl text-black -tracking-[0.4px]">
          Get your own Firespot QRKit
        </h1>
        <p className="font-medium text-sm text-[#00000080] max-w-[345px] text-center mb-6">
          Customers send money faster. You look more professional.
        </p>

        <form onSubmit={onSubmit} className="w-full max-w-[400px] space-y-6">
          <div>
            <Label>Phone number</Label>
            <PhoneInput
              className="w-full"
              value={phoneNumber}
              onChange={onPhoneNumberChange}
            />
          </div>
          <div>
            <Label>Receiving bank</Label>
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
              className="w-full font-medium"
              value={accountNumber}
              onChange={(e) =>
                onAccountNumberChange(
                  e.target.value.replace(/\D/g, '').slice(0, 10),
                )
              }
            />

            {resolveAccount.isSuccess && (
              <div className="h-11 bg-[#E9F9F0] flex items-center gap-2 mt-2 rounded-[8px] px-4">
                <CircleCheck className="w-5 h-5 text-[#ffffff]" fill="#24C166" />
                <p className="text-sm text-[#24C166] font-medium">
                  {resolveAccount.data.accountName}
                </p>
              </div>
            )}
          </div>
          <div>
            <Label>Refferal code (optional)</Label>
            <Input
              type="text"
              placeholder="FIRESPOT25"
              className="w-full uppercase font-medium"
              value={referralCode}
              onChange={(e) => onReferralCodeChange(e.target.value.toUpperCase())}
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Continue'}
          </Button>
        </form>
        <p className="text-sm text-[#00000080] mt-4 font-bold font-satoshi">
          Already have one?{' '}
          <Link
            href="/login"
            className="bg-linear-to-r from-[#D72483] to-[#FB5012] text-transparent bg-clip-text"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
