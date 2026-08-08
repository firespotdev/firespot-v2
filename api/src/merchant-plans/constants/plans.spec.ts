import {
  PLAN_STATE_PROJECTION,
  calculateProration,
  classifyPlanChange,
  getEffectiveTier,
  getNextStep,
  isCancelledAndExpired,
  isInGracePeriod,
  isLapsed,
  isStepSatisfied,
  resolvePeriodWindow,
  type PlanStateLike,
} from './plans'

const DAY = 24 * 60 * 60 * 1000
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY)

describe('getEffectiveTier', () => {
  it('exempts grandfathered merchants who never bought a plan', () => {
    expect(getEffectiveTier({})).toBeUndefined()
    expect(getEffectiveTier({ planTier: 'NONSENSE' })).toBeUndefined()
  })

  it('returns the paid tier while the plan is healthy', () => {
    expect(getEffectiveTier({ planTier: 'PRO', planStatus: 'verified' })).toBe(
      'PRO',
    )
  })

  it('keeps the tier inside the grace window after a failed charge', () => {
    expect(
      getEffectiveTier({
        planTier: 'PROMAX',
        planStatus: 'failed',
        planGraceUntil: daysFromNow(3),
      }),
    ).toBe('PROMAX')
  })

  it('drops to the LITE floor once the grace window has elapsed', () => {
    expect(
      getEffectiveTier({
        planTier: 'PROMAX',
        planStatus: 'failed',
        planGraceUntil: daysFromNow(-1),
      }),
    ).toBe('LITE')
  })

  it('applies a scheduled downgrade the moment it falls due', () => {
    expect(
      getEffectiveTier({
        planTier: 'PROMAX',
        planStatus: 'verified',
        pendingPlanChange: { tier: 'PRO', effectiveAt: daysFromNow(-1) },
      }),
    ).toBe('PRO')
  })

  it('ignores a scheduled downgrade that has not yet fallen due', () => {
    expect(
      getEffectiveTier({
        planTier: 'PROMAX',
        planStatus: 'verified',
        pendingPlanChange: { tier: 'PRO', effectiveAt: daysFromNow(5) },
      }),
    ).toBe('PROMAX')
  })

  // --- Cancellation: the merchant paid for this period and keeps it. ---

  it('keeps the tier after cancelling until the paid period ends', () => {
    expect(
      getEffectiveTier({
        planTier: 'PRO',
        planStatus: 'verified',
        cancelAtPeriodEnd: true,
        planCurrentPeriodEnd: daysFromNow(25),
      }),
    ).toBe('PRO')
  })

  it('drops to the LITE floor once a cancelled period has expired', () => {
    expect(
      getEffectiveTier({
        planTier: 'PRO',
        planStatus: 'verified',
        cancelAtPeriodEnd: true,
        planCurrentPeriodEnd: daysFromNow(-1),
      }),
    ).toBe('LITE')
  })

  it('does not demote a cancelled plan with no recorded period end', () => {
    // Nothing to expire against — better to keep serving than to strip a
    // merchant on missing data.
    expect(
      getEffectiveTier({
        planTier: 'PRO',
        planStatus: 'verified',
        cancelAtPeriodEnd: true,
        planCurrentPeriodEnd: null,
      }),
    ).toBe('PRO')
  })
})

describe('isLapsed / isInGracePeriod / isCancelledAndExpired', () => {
  it('treats an expired cancellation as lapsed, not as a payment failure', () => {
    const user: PlanStateLike = {
      planTier: 'PRO',
      planStatus: 'verified',
      cancelAtPeriodEnd: true,
      planCurrentPeriodEnd: daysFromNow(-1),
    }
    expect(isCancelledAndExpired(user)).toBe(true)
    expect(isLapsed(user)).toBe(true)
    // The banner must not say "Payment failed" — nothing failed.
    expect(isInGracePeriod(user)).toBe(false)
  })

  it('does not treat a live cancellation as lapsed', () => {
    const user: PlanStateLike = {
      planTier: 'PRO',
      planStatus: 'verified',
      cancelAtPeriodEnd: true,
      planCurrentPeriodEnd: daysFromNow(10),
    }
    expect(isCancelledAndExpired(user)).toBe(false)
    expect(isLapsed(user)).toBe(false)
  })

  it('reports a failed charge inside its window as grace, not lapsed', () => {
    const user: PlanStateLike = {
      planTier: 'PRO',
      planStatus: 'failed',
      planGraceUntil: daysFromNow(2),
    }
    expect(isLapsed(user)).toBe(false)
    expect(isInGracePeriod(user)).toBe(true)
  })
})

describe('PLAN_STATE_PROJECTION', () => {
  // Guards the trap this projection exists to prevent: a field the resolver
  // reads but the query never fetches fails silently, changing entitlements.
  it.each([
    'planTier',
    'planStatus',
    'planGraceUntil',
    'kycCompletedAt',
    'pendingPlanChange',
    'cancelAtPeriodEnd',
    'planCurrentPeriodEnd',
  ])('projects %s', (field) => {
    expect(PLAN_STATE_PROJECTION.split(' ')).toContain(field)
  })
})

describe('classifyPlanChange', () => {
  const base = {
    currentTier: 'PRO',
    currentInterval: 'monthly',
    hasLiveSubscription: true,
  }

  it('treats a fresh buyer as a plain purchase', () => {
    expect(
      classifyPlanChange({
        ...base,
        currentTier: null,
        hasLiveSubscription: false,
        targetTier: 'PRO',
        targetInterval: 'monthly',
      }),
    ).toBe('purchase')
  })

  it('prorates a same-cadence tier upgrade', () => {
    expect(
      classifyPlanChange({
        ...base,
        targetTier: 'PROMAX',
        targetInterval: 'monthly',
      }),
    ).toBe('prorated_upgrade')
  })

  it('defers a same-cadence tier downgrade', () => {
    expect(
      classifyPlanChange({
        ...base,
        currentTier: 'PROMAX',
        targetTier: 'PRO',
        targetInterval: 'monthly',
      }),
    ).toBe('scheduled_downgrade')
  })

  it('routes a drop to LITE through cancellation', () => {
    expect(
      classifyPlanChange({ ...base, targetTier: 'LITE', targetInterval: 'monthly' }),
    ).toBe('cancellation')
  })

  it('lets cadence dominate tier direction (monthly to yearly)', () => {
    expect(
      classifyPlanChange({
        ...base,
        targetTier: 'PRO',
        targetInterval: 'annually',
      }),
    ).toBe('cadence_extension')
  })

  it('blocks yearly to monthly — there is no refund path', () => {
    expect(
      classifyPlanChange({
        ...base,
        currentInterval: 'annually',
        targetTier: 'PRO',
        targetInterval: 'monthly',
      }),
    ).toBe('blocked_cadence')
  })

  it('rejects a no-op change', () => {
    expect(
      classifyPlanChange({ ...base, targetTier: 'PRO', targetInterval: 'monthly' }),
    ).toBe('noop')
  })

  it('lets a merchant repurchase once their period has actually expired', () => {
    // Regression: a merchant wrongly demoted mid-period used to hit `noop` and
    // could not buy their way out. With no live subscription it is a purchase.
    expect(
      classifyPlanChange({
        ...base,
        hasLiveSubscription: false,
        targetTier: 'PRO',
        targetInterval: 'monthly',
      }),
    ).toBe('purchase')
  })
})

describe('calculateProration', () => {
  // 20 of 30 days remaining, matching the worked examples in
  // docs/merchant-plans-and-subscriptions.md.
  const window = {
    periodStart: new Date(Date.now() - 10 * DAY),
    periodEnd: new Date(Date.now() + 20 * DAY),
  }

  it('charges only the difference on a same-cadence upgrade', () => {
    const { amountDue, subtotal, credit } = calculateProration({
      currentAmount: 6000,
      newAmount: 10000,
      ...window,
    })
    expect(subtotal).toBe(6667)
    expect(credit).toBe(4000)
    expect(subtotal - credit).toBe(amountDue)
    expect(amountDue).toBe(2667)
  })

  it('charges a full year less credit when the period resets', () => {
    const { amountDue, credit } = calculateProration({
      currentAmount: 6000,
      newAmount: 72000,
      ...window,
      resetsPeriod: true,
    })
    expect(credit).toBe(4000)
    expect(amountDue).toBe(68000)
  })

  it('never returns a negative charge', () => {
    const { amountDue } = calculateProration({
      currentAmount: 100000,
      newAmount: 6000,
      ...window,
    })
    expect(amountDue).toBe(0)
  })

  it('owes the full new price when the period is unknown and resets', () => {
    const { amountDue } = calculateProration({
      currentAmount: 6000,
      newAmount: 72000,
      periodStart: null,
      periodEnd: null,
      resetsPeriod: true,
    })
    expect(amountDue).toBe(72000)
  })
})

describe('resolvePeriodWindow', () => {
  it('derives a missing start from the end and the cadence', () => {
    const end = new Date('2025-06-15T00:00:00.000Z')
    const monthly = resolvePeriodWindow({ periodEnd: end, interval: 'monthly' })
    expect(monthly.periodStart?.toISOString()).toBe('2025-05-15T00:00:00.000Z')

    const annual = resolvePeriodWindow({ periodEnd: end, interval: 'annually' })
    expect(annual.periodStart?.toISOString()).toBe('2024-06-15T00:00:00.000Z')
  })

  it('returns nulls when there is no end date to work from', () => {
    expect(resolvePeriodWindow({ periodEnd: null, interval: 'monthly' })).toEqual(
      { periodStart: null, periodEnd: null },
    )
  })
})

describe('KYC step satisfaction', () => {
  const biometric = {
    key: 'bvn' as const,
    product: 'biometric_kyc' as const,
    idType: 'BVN',
    label: 'x',
  }

  it('does not accept a weaker product for a stronger requirement', () => {
    expect(
      isStepSatisfied(biometric, { status: 'passed', product: 'enhanced_kyc' }),
    ).toBe(false)
  })

  it('accepts a product at least as strong', () => {
    expect(
      isStepSatisfied(biometric, { status: 'passed', product: 'biometric_kyc' }),
    ).toBe(true)
  })

  it('reopens the BVN step when LITE upgrades to PRO', () => {
    // LITE proved BVN with an enhanced lookup; PRO needs the selfie.
    const kyc = {
      nin: { status: 'passed', product: 'enhanced_kyc' },
      bvn: { status: 'passed', product: 'enhanced_kyc' },
    }
    expect(getNextStep('LITE', kyc)).toBeNull()
    expect(getNextStep('PRO', kyc)?.key).toBe('bvn')
  })
})
