'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CircleCheck } from 'lucide-react'
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
import { useAddBankAccount } from '@/services/users'
import { useAuthStore } from '@/services/auth'
import { showNotificationToast } from '@/components/ui'

export default function AddBankAccountPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const { data: banks = [], isLoading: banksLoading } = useBanks()
  const resolveAccount = useResolveAccount()
  const addBankAccount = useAddBankAccount()

  const [selectedBankCode, setSelectedBankCode] = useState('')
  const [selectedBankName, setSelectedBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [error, setError] = useState<string | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const resolvedRef = useRef<string>('')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

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
            },
            onError: () => {
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
  }, [accountNumber, selectedBankCode, resolveAccount])

  if (!isAuthenticated) {
    return null
  }

  const handleBankSelectChange = (value: string) => {
    const bank = banks.find((b) => b.code === value)
    if (bank) {
      setSelectedBankCode(bank.code)
      setSelectedBankName(bank.name)
    } else {
      setSelectedBankCode('')
      setSelectedBankName('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedBankCode || !selectedBankName) {
      setError('Please select a bank')
      return
    }

    if (accountNumber.length !== 10) {
      setError('Please enter a valid 10-digit account number')
      return
    }

    if (!resolveAccount.isSuccess) {
      setError('Please wait for account verification')
      return
    }

    addBankAccount.mutate(
      {
        bankName: selectedBankName,
        bankCode: selectedBankCode,
        accountNumber,
      },
      {
        onSuccess: () => {
          showNotificationToast({ message: 'Bank account added successfully!' })
          router.push('/bank-accounts')
        },
        onError: (err: any) => {
          const message =
            err?.response?.data?.message || 'Failed to add bank account'
          setError(message)
        },
      },
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-satoshi">
      {/* Header */}
      <header className="flex items-center p-4">
        <ArrowLeft
          className="w-6 h-6 text-black"
          onClick={() => router.back()}
        />
      </header>

      {/* Content */}
      <div className="flex-1 px-4">
        <h1 className="font-bold text-xl text-black mb-1">
          Add another bank account
        </h1>
        <p className="text-sm text-[#00000080] font-medium mb-6">
          Give your customers more ways to pay you
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                    banksLoading ? 'Loading banks...' : 'Select bank'
                  }
                >
                  {selectedBankName || 'Select bank'}
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
              type="text"
              inputMode="numeric"
              placeholder="Enter your account number"
              className="w-full font-medium"
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
              }
            />

            {resolveAccount.isPending && (
              <div className="h-11 bg-[#F4F6F8] flex items-center gap-2 mt-2 rounded-[8px] px-4">
                <div className="w-5 h-5 border-2 border-[#878F98] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#878F98] font-medium">
                  Verifying account...
                </p>
              </div>
            )}

            {resolveAccount.isSuccess && (
              <div className="h-11 bg-[#E9F9F0] flex items-center gap-2 mt-2 rounded-[8px] px-4">
                <CircleCheck
                  className="w-5 h-5 text-[#ffffff]"
                  fill="#24C166"
                />
                <p className="text-sm text-[#24C166] font-medium">
                  {resolveAccount.data.data.account_name}
                </p>
              </div>
            )}

            {resolveAccount.isError && (
              <div className="h-11 bg-[#FEE2E2] flex items-center gap-2 mt-2 rounded-[8px] px-4">
                <p className="text-sm text-[#DC2626] font-medium">
                  Could not verify account. Please check the details.
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </form>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-6">
        <Button
          type="submit"
          onClick={handleSubmit}
          className="w-full bg-black text-white rounded-[48px] h-12 font-bold disabled:opacity-50"
        >
          {addBankAccount.isPending ? <Spinner /> : 'Save account details'}
        </Button>
      </div>
    </div>
  )
}
