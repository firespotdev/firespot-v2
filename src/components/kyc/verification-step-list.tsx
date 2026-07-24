'use client'

import { ActionList, ActionListItem, StatusCircle } from '@/components/ui'
import type { KycCheckStatus, KycStep } from '@/services/kyc'
// KycCheck is declared in the merchant-plans domain (it mirrors the backend's
// plan constants); the kyc barrel consumes it without re-exporting.
import type { KycCheck } from '@/services/merchant-plans'
import { ReactNode } from 'react'
import {
  FingerprintIcon,
  HashIcon,
  ScanSmileyIcon,
} from '@phosphor-icons/react'

/**
 * A row the merchant sees. Not the same as an API step: one biometric BVN job
 * proves the ID *and* the selfie, but the design lists those as two rows, so
 * the display splits what the backend tracks as a single check.
 */
export type VerificationRowKey = 'bvn' | 'nin' | 'liveness' | 'cac'

interface RowMeta {
  title: string
  subtitle: string
  Icon: ReactNode
  /** Any CSS `background` value — a solid colour or a gradient. */
  bg: string
}

const ROW_META: Record<VerificationRowKey, RowMeta> = {
  bvn: {
    title: 'BVN',
    subtitle: 'Your Bank Verification Number',
    Icon: <HashIcon size={24} color="white" />,
    bg: '#0075FF',
  },
  nin: {
    title: 'NIN',
    subtitle: 'Your National Identification Number',
    Icon: (
      <FingerprintIcon weight="fill" color="white" strokeWidth={2} size={24} />
    ),
    bg: '#24C166',
  },
  liveness: {
    title: 'Liveness Check',
    subtitle: 'Take a selfie so we know you’re real',
    Icon: <ScanSmileyIcon size={24} weight="fill" color="white" />,
    bg: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
  },
  cac: {
    title: 'CAC',
    subtitle: 'Your CAC number and certificate',
    Icon: <ScanSmileyIcon size={24} weight="fill" color="white" />,
    bg: '#3B9BF5',
  },
}

export interface VerificationRow {
  key: VerificationRowKey
  status: KycCheckStatus
  reason: string | null
  /** The API step behind this row — two rows can share one check. */
  sourceKey: KycCheck
}

/**
 * Display order, which is not the order the API returns steps in: the selfie
 * rides along with the BVN job, so it would otherwise surface before NIN.
 */
const ROW_ORDER: VerificationRowKey[] = ['nin', 'bvn', 'liveness', 'cac']

/** Expands the API's steps into the rows the design shows. */
export function buildVerificationRows(steps: KycStep[]): VerificationRow[] {
  const rows: VerificationRow[] = []

  for (const step of steps) {
    const shared = {
      status: step.status,
      reason: step.reason,
      sourceKey: step.key,
    }

    if (step.key === 'bvn') {
      rows.push({ key: 'bvn', ...shared })
      // The selfie is part of the same job, so it carries the same status
      // rather than being independently completable.
      if (step.requiresSelfie) rows.push({ key: 'liveness', ...shared })
      continue
    }

    if (step.key === 'nin') rows.push({ key: 'nin', ...shared })
    if (step.key === 'cac') rows.push({ key: 'cac', ...shared })
  }

  return [...rows].sort(
    (a, b) => ROW_ORDER.indexOf(a.key) - ROW_ORDER.indexOf(b.key),
  )
}

function RowIcon({ Icon, bg }: Pick<RowMeta, 'Icon' | 'bg'>) {
  return (
    <span
      className="w-9 h-9 rounded-[10px] flex items-center justify-center"
      // `background`, not `backgroundColor` — the liveness swatch is a gradient.
      style={{ background: bg }}
    >
      {Icon}
    </span>
  )
}

interface VerificationStepListProps {
  rows: VerificationRow[]
  /** Tapping a failed row retries that check. Omit to make rows inert. */
  onRetry?: (check: KycCheck) => void
  className?: string
}

export function VerificationStepList({
  rows,
  onRetry,
  className,
}: VerificationStepListProps) {
  return (
    <ActionList rounded="12" className={className}>
      {rows.map((row) => {
        const meta = ROW_META[row.key]
        const failed = row.status === 'failed'
        const retry =
          failed && onRetry ? () => onRetry(row.sourceKey) : undefined

        return (
          <ActionListItem
            key={row.key}
            icon={<RowIcon Icon={meta.Icon} bg={meta.bg} />}
            title={<span className="font-bold text-[14px]">{meta.title}</span>}
            // Surface SmileID's actual reason on a failure instead of the
            // generic description, so the merchant can correct it.
            subtitle={
              failed && row.reason ? (
                row.reason
              ) : (
                <span className="font-medium text-[#64748B] text-xs">
                  {meta.subtitle}
                </span>
              )
            }
            trailing={
              <StatusCircle
                state={row.status === 'pending' ? 'empty' : row.status}
              />
            }
            onClick={retry}
            // Only a failed row does anything, so the rest drop the affordance.
            className={
              retry
                ? undefined
                : 'cursor-default hover:bg-transparent active:bg-transparent p-3'
            }
          />
        )
      })}
    </ActionList>
  )
}
