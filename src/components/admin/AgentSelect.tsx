'use client'

import { useAgents } from '@/services/agents'

interface AgentSelectProps {
  value: string | null
  onChange: (agentId: string | null) => void
  placeholder?: string
  showNoneOption?: boolean
  disabled?: boolean
  className?: string
}

export default function AgentSelect({
  value,
  onChange,
  placeholder = 'Select an agent',
  showNoneOption = true,
  disabled = false,
  className = '',
}: AgentSelectProps) {
  const { data, isLoading } = useAgents({ status: 'active', limit: 100 })

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled || isLoading}
      className={`w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-[#FB5012] focus:outline-none focus:ring-1 focus:ring-[#FB5012] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {isLoading ? (
        <option value="">Loading agents...</option>
      ) : (
        <>
          <option value="">{showNoneOption ? 'None' : placeholder}</option>
          {data?.data.map((agent) => (
            <option key={agent._id} value={agent._id}>
              {agent.name} ({agent.agentId})
            </option>
          ))}
        </>
      )}
    </select>
  )
}
