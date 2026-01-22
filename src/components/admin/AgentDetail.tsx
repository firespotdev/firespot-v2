'use client'

import { useAgent, useUpdateAgent } from '@/services/agents'
import type { Agent } from '@/services/agents'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { adminToast } from './AdminToast'
import { useState } from 'react'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

function StatusBadge({ status }: { status: string }) {
  const getStyles = () => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'suspended':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <span
      className={`inline-flex rounded-lg border px-3 py-1 text-sm font-medium capitalize ${getStyles()}`}
    >
      {status}
    </span>
  )
}

interface StatCardProps {
  title: string
  value: number
  color?: 'default' | 'emerald' | 'amber' | 'gray'
}

function StatCard({ title, value, color = 'default' }: StatCardProps) {
  const colorStyles = {
    default: 'bg-white border-gray-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    gray: 'bg-gray-50 border-gray-100',
  }

  return (
    <div className={`rounded-xl border p-4 ${colorStyles[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

interface AgentDetailProps {
  agent: Agent
  onClose: () => void
}

export default function AgentDetail({ agent, onClose }: AgentDetailProps) {
  const { data: agentWithStats, isLoading, error } = useAgent(agent._id)
  const updateAgent = useUpdateAgent()
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    status: 'active' | 'inactive' | 'suspended'
    title: string
    description: string
    variant: 'danger' | 'warning' | 'default'
  } | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const openStatusConfirmDialog = (
    newStatus: 'active' | 'inactive' | 'suspended',
  ) => {
    const configs = {
      active: {
        title: 'Activate Agent',
        description: `Are you sure you want to activate ${currentAgent.name}? They will be able to receive QR kit assignments.`,
        variant: 'default' as const,
      },
      inactive: {
        title: 'Deactivate Agent',
        description: `Are you sure you want to deactivate ${currentAgent.name}? They will no longer appear in the active agents list.`,
        variant: 'warning' as const,
      },
      suspended: {
        title: 'Suspend Agent',
        description: `Are you sure you want to suspend ${currentAgent.name}? This will prevent them from receiving any new QR kit assignments.`,
        variant: 'danger' as const,
      },
    }

    setConfirmDialog({
      open: true,
      status: newStatus,
      ...configs[newStatus],
    })
  }

  const handleStatusChange = async () => {
    if (!confirmDialog) return

    try {
      await updateAgent.mutateAsync({
        id: agent._id,
        dto: { status: confirmDialog.status },
      })
      adminToast.success(`Agent ${confirmDialog.status} successfully`)
      setConfirmDialog(null)
    } catch (error) {
      adminToast.error(
        error instanceof Error ? error.message : 'Failed to update agent status',
      )
    }
  }

  const currentAgent = agentWithStats || agent
  const stats = agentWithStats?.qrKitStats

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{
                  background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
                }}
              >
                {currentAgent.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {currentAgent.name || 'Unknown Agent'}
                </h2>
                <p className="font-mono text-sm text-gray-500">
                  {currentAgent.agentId || 'N/A'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6 p-6">
            {/* Error State */}
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  Failed to load agent details. Showing cached data.
                </p>
              </div>
            )}

            {/* Status Section */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Status
              </h3>
              <div className="mt-2">
                <StatusBadge status={currentAgent.status || 'inactive'} />
              </div>
              {/* Action Buttons - positioned below status */}
              <div className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
                {(currentAgent.status || 'inactive') !== 'active' && (
                  <button
                    onClick={() => openStatusConfirmDialog('active')}
                    disabled={updateAgent.isPending}
                    className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Activate
                  </button>
                )}
                {(currentAgent.status || 'inactive') !== 'suspended' && (
                  <button
                    onClick={() => openStatusConfirmDialog('suspended')}
                    disabled={updateAgent.isPending}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Suspend
                  </button>
                )}
                {(currentAgent.status || 'inactive') === 'active' && (
                  <button
                    onClick={() => openStatusConfirmDialog('inactive')}
                    disabled={updateAgent.isPending}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>

            {/* QRKit Stats */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl bg-gray-100"
                  />
                ))}
              </div>
            ) : stats ? (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  QR Kit Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard title="Total Assigned" value={stats.total} />
                  <StatCard
                    title="Activated"
                    value={stats.byActivationStatus.activated}
                    color="emerald"
                  />
                  <StatCard
                    title="Pending"
                    value={stats.byActivationStatus.pending}
                    color="amber"
                  />
                  <StatCard
                    title="Deactivated"
                    value={stats.byActivationStatus.deactivated}
                    color="gray"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  QR Kit Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard title="Total Assigned" value={0} />
                  <StatCard title="Activated" value={0} color="emerald" />
                  <StatCard title="Pending" value={0} color="amber" />
                  <StatCard title="Deactivated" value={0} color="gray" />
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Contact Information
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-400">Phone Number</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {currentAgent.phoneNumber || 'N/A'}
                  </dd>
                </div>
                {currentAgent.email && (
                  <div>
                    <dt className="text-xs text-gray-400">Email</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {currentAgent.email}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Location */}
            {(currentAgent.state ||
              currentAgent.lga ||
              currentAgent.bustop) && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Location
                </h3>
                <dl className="space-y-3">
                  {currentAgent.state && (
                    <div>
                      <dt className="text-xs text-gray-400">State</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {currentAgent.state}
                      </dd>
                    </div>
                  )}
                  {currentAgent.lga && (
                    <div>
                      <dt className="text-xs text-gray-400">
                        Local Government Area
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {currentAgent.lga}
                      </dd>
                    </div>
                  )}
                  {currentAgent.bustop && (
                    <div>
                      <dt className="text-xs text-gray-400">Bus Stop</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {currentAgent.bustop}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Notes */}
            {currentAgent.notes && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Notes
                </h3>
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {currentAgent.notes}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Timestamps
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-400">Created</dt>
                  <dd className="text-sm text-gray-900">
                    {currentAgent.createdAt
                      ? formatDate(currentAgent.createdAt)
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Last Updated</dt>
                  <dd className="text-sm text-gray-900">
                    {currentAgent.updatedAt
                      ? formatDate(currentAgent.updatedAt)
                      : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog for Status Change */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={
            confirmDialog.status === 'active'
              ? 'Activate'
              : confirmDialog.status === 'suspended'
                ? 'Suspend'
                : 'Deactivate'
          }
          cancelLabel="Cancel"
          variant={confirmDialog.variant}
          onConfirm={handleStatusChange}
          isLoading={updateAgent.isPending}
        />
      )}
    </>
  )
}
