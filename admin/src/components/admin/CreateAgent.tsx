'use client'

import { useState } from 'react'
import { useCreateAgent } from '@/services/agents'
import type { Agent } from '@/services/agents'
import { adminToast } from './AdminToast'
import AgentForm from './AgentForm'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface CreateAgentProps {
  onSuccess?: (agent: Agent) => void
}

export default function CreateAgent({ onSuccess }: CreateAgentProps) {
  const [createdAgents, setCreatedAgents] = useState<Agent[]>([])

  const createAgent = useCreateAgent()

  const handleSubmit = async (data: any) => {
    try {
      const agent = await createAgent.mutateAsync(data)

      setCreatedAgents((prev) => [agent, ...prev])
      adminToast.success(`Agent ${agent.name} created successfully`)
      onSuccess?.(agent)
    } catch (error) {
      adminToast.error(
        error instanceof Error ? error.message : 'Failed to create agent',
      )
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

          <AgentForm
            onSubmit={handleSubmit}
            isSubmitting={createAgent.isPending}
            submitLabel="Create Agent"
          />

          {createAgent.isError && (
            <p className="mt-4 text-sm text-red-600">
              {createAgent.error instanceof Error
                ? createAgent.error.message
                : 'Failed to create agent'}
            </p>
          )}
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
