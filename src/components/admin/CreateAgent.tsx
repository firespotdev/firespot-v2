'use client'

import { useState } from 'react'
import { useCreateAgent } from '@/services/agents'
import type { Agent, CreateAgentDto } from '@/services/agents'
import {
  NIGERIAN_STATES,
  STATE_LGA_MAP,
} from '@/lib/utils/nigerian-states-lgas'
import { adminToast } from './AdminToast'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface FormErrors {
  name?: string
  phoneNumber?: string
  email?: string
}

interface CreateAgentProps {
  onSuccess?: (agent: Agent) => void
}

export default function CreateAgent({ onSuccess }: CreateAgentProps) {
  const [formData, setFormData] = useState<CreateAgentDto>({
    name: '',
    phoneNumber: '',
    email: '',
    state: '',
    lga: '',
    bustop: '',
    notes: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [createdAgents, setCreatedAgents] = useState<Agent[]>([])

  // Get LGAs for selected state
  const availableLGAs = formData.state
    ? STATE_LGA_MAP[formData.state] || []
    : []

  const createAgent = useCreateAgent()

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    // Nigerian phone number validation
    const phoneRegex = /^0[789][01]\d{8}$|^[789][01]\d{8}$/
    if (!formData.phoneNumber || !phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Nigerian phone number'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      const agent = await createAgent.mutateAsync({
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email?.trim() || undefined,
        state: formData.state || undefined,
        lga: formData.lga || undefined,
        bustop: formData.bustop?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      })

      setCreatedAgents((prev) => [agent, ...prev])
      setFormData({
        name: '',
        phoneNumber: '',
        email: '',
        state: '',
        lga: '',
        bustop: '',
        notes: '',
      })
      setErrors({})
      adminToast.success(`Agent ${agent.name} created successfully`)
      onSuccess?.(agent)
    } catch (error) {
      adminToast.error(
        error instanceof Error ? error.message : 'Failed to create agent',
      )
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }
      // Clear LGA when state changes
      if (name === 'state') {
        newData.lga = ''
      }
      return newData
    })
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Add New Agent</h2>
        <p className="mt-1 text-gray-500">
          Create a field agent to distribute QR kits
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create Form */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="rounded-xl p-3"
              style={{
                background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
              }}
            >
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Agent Details
              </h3>
              <p className="text-sm text-gray-500">
                Enter the agent&apos;s information
              </p>
            </div>
          </div>

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
              <p className="mt-1 text-xs text-gray-400">
                Nigerian phone number format
              </p>
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
                Local Government Area (LGA)
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={createAgent.isPending}
              className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createAgent.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </span>
              ) : (
                'Create Agent'
              )}
            </button>

            {createAgent.isError && (
              <p className="text-sm text-red-600">
                {createAgent.error instanceof Error
                  ? createAgent.error.message
                  : 'Failed to create agent'}
              </p>
            )}
          </form>
        </div>

        {/* Recently Created */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Recently Created
          </h3>
          {createdAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-500">No agents created yet</p>
              <p className="mt-1 text-sm text-gray-400">
                Fill out the form to create an agent
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {createdAgents.slice(0, 10).map((agent) => (
                <div
                  key={agent._id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 p-3"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{
                      background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
                    }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {agent.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {agent.agentId}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {agent.status}
                  </span>
                </div>
              ))}
              {createdAgents.length > 10 && (
                <p className="text-center text-sm text-gray-500">
                  And {createdAgents.length - 10} more...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
