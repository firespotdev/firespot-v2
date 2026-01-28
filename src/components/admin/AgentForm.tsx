'use client'

import { useState, useEffect } from 'react'
import type { CreateAgentDto, UpdateAgentDto, Agent } from '@/services/agents'
import {
  NIGERIAN_STATES,
  STATE_LGA_MAP,
} from '@/lib/utils/nigerian-states-lgas'
import { useBanks, useResolveAccount } from '@/services/paystack/paystackApi'

interface FormErrors {
  name?: string
  phoneNumber?: string
  email?: string
  bankCode?: string
  accountNumber?: string
}

interface AgentFormProps {
  initialData?: Partial<CreateAgentDto | UpdateAgentDto>
  onSubmit: (data: CreateAgentDto | UpdateAgentDto) => Promise<void>
  isSubmitting: boolean
  submitLabel?: string
  onCancel?: () => void
}

export default function AgentForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save Agent',
  onCancel,
}: AgentFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phoneNumber: initialData?.phoneNumber || '',
    email: initialData?.email || '',
    state: initialData?.state || '',
    lga: initialData?.lga || '',
    bustop: initialData?.bustop || '',
    notes: initialData?.notes || '',
    bankCode: (initialData as any)?.bankCode || '',
    accountNumber: (initialData as any)?.accountNumber || '',
  })
  const [resolvedAccountName, setResolvedAccountName] = useState<string>(
    (initialData as any)?.accountName || ''
  )
  const [errors, setErrors] = useState<FormErrors>({})

  const { data: banksResponse, isLoading: isLoadingBanks } = useBanks()
  const resolveAccount = useResolveAccount()

  const availableLGAs = formData.state
    ? STATE_LGA_MAP[formData.state] || []
    : []

  // Track the last resolved account to prevent redundant calls
  const [lastResolved, setLastResolved] = useState({
    bankCode: '',
    accountNumber: '',
  })

  // Auto-resolve account name when bank and account number are present
  useEffect(() => {
    // Basic validation before even considering a resolve
    if (!formData.bankCode || formData.accountNumber?.length !== 10) {
      setResolvedAccountName('')
      return
    }

    // Skip if it's the initial account name and hasn't changed
    if (
      (initialData as any)?.accountNumber === formData.accountNumber &&
      (initialData as any)?.bankCode === formData.bankCode &&
      (initialData as any)?.accountName
    ) {
      setResolvedAccountName((initialData as any).accountName)
      return
    }

    // Skip if we just resolved this exact combination
    if (
      lastResolved.bankCode === formData.bankCode &&
      lastResolved.accountNumber === formData.accountNumber
    ) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        const result = await resolveAccount.mutateAsync({
          accountNumber: formData.accountNumber,
          bankCode: formData.bankCode,
        })
        setResolvedAccountName(result.accountName)
        setLastResolved({
          bankCode: formData.bankCode,
          accountNumber: formData.accountNumber,
        })
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || ''
        if (errorMessage.includes('limit')) {
          const bank = banksResponse?.find(
            (b: any) => b.code === formData.bankCode
          )
          setResolvedAccountName(
            bank
              ? `${bank.name} (Verification Pending)`
              : 'Bypassed (Test Mode Limit)'
          )
        } else {
          setResolvedAccountName('')
        }
        // Still set last resolved to prevent retry loops on error
        setLastResolved({
          bankCode: formData.bankCode,
          accountNumber: formData.accountNumber,
        })
      }
    }, 600) // 600ms debounce

    return () => clearTimeout(timer)
  }, [
    formData.bankCode,
    formData.accountNumber,
    initialData,
    resolveAccount,
    lastResolved,
  ])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    const phoneRegex = /^0[789][01]\d{8}$|^[789][01]\d{8}$/
    if (!formData.phoneNumber || !phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Nigerian phone number'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.bankCode) {
      newErrors.bankCode = 'Please select a bank'
    }

    if (!formData.accountNumber || formData.accountNumber.length !== 10) {
      newErrors.accountNumber = 'Account number must be 10 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const submissionData = {
      ...formData,
      name: formData.name.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      email: formData.email?.trim() || undefined,
      state: formData.state || undefined,
      lga: formData.lga || undefined,
      bustop: formData.bustop?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      bankName: banksResponse?.find((b: any) => b.code === formData.bankCode)?.name,
      accountName: resolvedAccountName || undefined,
    }

    await onSubmit(submissionData as CreateAgentDto)
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }
      if (name === 'state') {
        newData.lga = ''
      }
      return newData
    })
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          className={`w-full rounded-xl border bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-1 ${
            errors.name
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-200 focus:border-[#FB5012] focus:ring-[#FB5012]'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Phone Number */}
      <div>
        <label
          htmlFor="phoneNumber"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="08012345678"
          className={`w-full rounded-xl border bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-1 ${
            errors.phoneNumber
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-200 focus:border-[#FB5012] focus:ring-[#FB5012]'
          }`}
        />
        {errors.phoneNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
          className={`w-full rounded-xl border bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-1 ${
            errors.email
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-200 focus:border-[#FB5012] focus:ring-[#FB5012]'
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* State */}
        <div>
          <label
            htmlFor="state"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            State
          </label>
          <select
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
          >
            <option value="">Select a state</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* LGA */}
        <div>
          <label
            htmlFor="lga"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            LGA
          </label>
          <select
            id="lga"
            name="lga"
            value={formData.lga}
            onChange={handleChange}
            disabled={!formData.state}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {formData.state ? 'Select an LGA' : 'Select a state first'}
            </option>
            {availableLGAs.map((lga) => (
              <option key={lga} value={lga}>
                {lga}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bustop */}
      <div>
        <label
          htmlFor="bustop"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Bus Stop
        </label>
        <input
          id="bustop"
          name="bustop"
          type="text"
          value={formData.bustop}
          onChange={handleChange}
          placeholder="e.g. Obantoko"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
        />
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Additional notes about the agent..."
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012]"
        />
      </div>

      {/* Bank Details Section */}
      <div className="border-t border-gray-100 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3-3v8a3 3 0 003 3z"
            />
          </svg>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Bank Details (for Paystack Payouts)
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="bankCode"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Select Bank <span className="text-red-500">*</span>
            </label>
            <select
              id="bankCode"
              name="bankCode"
              value={formData.bankCode}
              onChange={handleChange}
              className={`w-full rounded-xl border bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-1 ${
                errors.bankCode
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-200 focus:border-[#FB5012] focus:ring-[#FB5012]'
              }`}
            >
              <option value="">
                {isLoadingBanks ? 'Loading banks...' : 'Select a bank'}
              </option>
              {banksResponse?.map((bank: any) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
            {errors.bankCode && (
              <p className="mt-1 text-sm text-red-600">{errors.bankCode}</p>
            )}
          </div>

          {/* Account Number */}
          <div className="sm:col-span-2">
            <label
              htmlFor="accountNumber"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Account Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="accountNumber"
                name="accountNumber"
                type="text"
                maxLength={10}
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="0123456789"
                className={`w-full rounded-xl border bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-1 ${
                  errors.accountNumber
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#FB5012] focus:ring-[#FB5012]'
                }`}
              />
              {resolveAccount.isPending && (
                <div className="absolute right-3 top-3.5">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black block" />
                </div>
              )}
            </div>
            {errors.accountNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
            )}
            {resolvedAccountName && (
              <p className="mt-1 text-sm font-medium text-emerald-600">
                {resolvedAccountName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${
            onCancel ? 'flex-[2]' : 'w-full'
          } rounded-xl bg-black px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  )
}
