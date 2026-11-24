import type {
  PublicPolicyStatus,
  PublicShopPolicies,
} from '@/services/business-profile'

const CARD_CLASS =
  'rounded-[12px] border border-[#F1F1F1] bg-white px-4 py-3 shadow-[0px_4px_8px_0px_#0000000A]'

const STANDARD_POLICIES: Array<{
  key: 'returns' | 'exchanges' | 'cancellations' | 'refunds'
  label: string
  allowedText: string
  refusedText: string
}> = [
  {
    key: 'returns',
    label: 'Returns',
    allowedText: 'Accepted',
    refusedText: 'Not accepted',
  },
  {
    key: 'exchanges',
    label: 'Exchanges',
    allowedText: 'Allowed',
    refusedText: 'Not allowed',
  },
  {
    key: 'cancellations',
    label: 'Cancellations',
    allowedText: 'Allowed',
    refusedText: 'Not allowed',
  },
  {
    key: 'refunds',
    label: 'Refunds',
    allowedText: 'Allowed',
    refusedText: 'Not allowed',
  },
]

const withinDays = (days: number) =>
  `Within ${days} ${days === 1 ? 'day' : 'days'}`

function PolicyStatus({
  status,
  allowedText,
  refusedText,
}: {
  status: PublicPolicyStatus
  allowedText: string
  refusedText: string
}) {
  if (!status.allowed) {
    return <span className="text-[#9CA3AF]">{refusedText}</span>
  }
  return (
    <span>
      <span className="text-[#24A75A]">{allowedText}</span>
      {status.withinDays && (
        <span className="text-black"> · {withinDays(status.withinDays)}</span>
      )}
    </span>
  )
}

/** What a business allows after purchase, then its own policies. */
export function AboutShopPolicies({
  policies,
}: {
  policies: PublicShopPolicies
}) {
  return (
    <div className="space-y-3">
      <div className={`${CARD_CLASS} space-y-2.5`}>
        {STANDARD_POLICIES.map((policy) => (
          <div
            key={policy.key}
            className="flex items-center justify-between gap-3 text-[15px] font-medium"
          >
            <span className="text-[#6B7280]">{policy.label}</span>
            <PolicyStatus
              status={policies[policy.key]}
              allowedText={policy.allowedText}
              refusedText={policy.refusedText}
            />
          </div>
        ))}
      </div>

      {policies.customPolicies.map((policy) => (
        <div key={policy.id} className={CARD_CLASS}>
          <p className="text-[15px] font-medium text-[#6B7280]">
            {policy.title}
          </p>
          <p className="mt-1 text-[15px] font-medium leading-[135%] whitespace-pre-line text-black">
            {policy.details}
          </p>
          <p className="mt-1.5 text-[13px] font-medium text-[#9CA3AF]">
            {withinDays(policy.withinDays)}
          </p>
        </div>
      ))}
    </div>
  )
}
