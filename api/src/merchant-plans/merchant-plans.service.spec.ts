import { NotFoundException } from '@nestjs/common'
import { Types } from 'mongoose'
import { MerchantPlansService } from './merchant-plans.service'

const query = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
})

/** A PlanOrder stand-in. `amount` is naira; Paystack reports kobo. */
const makeOrder = (overrides: Record<string, any> = {}) => ({
  _id: new Types.ObjectId(),
  merchantId: new Types.ObjectId(),
  tier: 'PRO',
  amount: 6000,
  interval: 'monthly',
  billingType: 'monthly',
  isProration: false,
  paymentStatus: 'PENDING',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
})

const makeService = (overrides: Record<string, any> = {}) => {
  const planOrderModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(() => query({ acknowledged: true })),
    ...overrides.planOrderModel,
  }
  const userModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    ...overrides.userModel,
  }
  const paystackService = {
    verifyTransaction: jest.fn(),
    createSubscription: jest.fn(),
    disableSubscription: jest.fn(),
    fetchSubscription: jest.fn(),
    chargeAuthorization: jest.fn(),
    initializeTransaction: jest.fn(),
    ...overrides.paystackService,
  }
  const storesService = {
    countActive: jest.fn().mockResolvedValue(1),
    ...overrides.storesService,
  }
  const configService = {
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
    ...overrides.configService,
  }
  const merchantReferralsService = {
    reevaluateReferrer: jest.fn().mockResolvedValue(undefined),
    ...overrides.merchantReferralsService,
  }

  const service = new MerchantPlansService(
    planOrderModel as any,
    userModel as any,
    paystackService as any,
    storesService as any,
    configService as any,
    merchantReferralsService as any,
  )
  // Silence expected error/warn logging in tests.
  jest.spyOn((service as any).logger, 'error').mockImplementation(() => {})
  jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {})
  jest.spyOn((service as any).logger, 'log').mockImplementation(() => {})

  return {
    service,
    planOrderModel,
    userModel,
    paystackService,
    storesService,
    configService,
    merchantReferralsService,
  }
}

/** A User stand-in carrying just the plan/subscription state under test. */
const makeUser = (overrides: Record<string, any> = {}): Record<string, any> => ({
  _id: new Types.ObjectId(),
  paystackCustomerCode: 'CUS_1',
  planTier: 'PRO',
  planStatus: 'verified',
  planCurrentPeriodEnd: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
  cancelAtPeriodEnd: false,
  planGraceUntil: undefined,
  subscriptions: [],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('subscription lifecycle webhooks', () => {
  afterEach(() => jest.clearAllMocks())

  describe('handleSubscriptionLapse (invoice.payment_failed only)', () => {
    it('opens a grace window on a genuine failed charge', async () => {
      const user = makeUser({
        subscriptions: [{ code: 'SUB_1', status: 'active' }],
      })
      const { service, userModel } = makeService()
      userModel.findOne.mockReturnValue(query(user))

      await service.handleSubscriptionLapse('CUS_1', 'SUB_1')

      expect(user.planStatus).toBe('failed')
      expect(user.planGraceUntil).toBeInstanceOf(Date)
      expect(user.save).toHaveBeenCalled()
    })

    it('does not demote when the subscription was retired by us', async () => {
      // Regression: superseding after a paid upgrade, or cancelling on request,
      // disables the old subscription — whose webhook must not mark a paid-up
      // merchant as a failed payer.
      const user = makeUser({
        subscriptions: [{ code: 'SUB_old', status: 'cancelling' }],
      })
      const { service, userModel } = makeService()
      userModel.findOne.mockReturnValue(query(user))

      await service.handleSubscriptionLapse('CUS_1', 'SUB_old')

      expect(user.planStatus).toBe('verified')
      expect(user.planGraceUntil).toBeUndefined()
      expect(user.save).not.toHaveBeenCalled()
    })

    it('does not demote while another subscription is still active', async () => {
      const user = makeUser({
        subscriptions: [
          { code: 'SUB_old', status: 'active' },
          { code: 'SUB_new', status: 'active' },
        ],
      })
      const { service, userModel } = makeService()
      userModel.findOne.mockReturnValue(query(user))

      await service.handleSubscriptionLapse('CUS_1', 'SUB_old')

      expect(user.planStatus).toBe('verified')
    })

    it('opens the grace window only once', async () => {
      const existing = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      const user = makeUser({
        planStatus: 'failed',
        planGraceUntil: existing,
        subscriptions: [{ code: 'SUB_1', status: 'active' }],
      })
      const { service, userModel } = makeService()
      userModel.findOne.mockReturnValue(query(user))

      await service.handleSubscriptionLapse('CUS_1', 'SUB_1')

      expect(user.planGraceUntil).toBe(existing)
    })
  })

  describe('markSubscriptionNonRenewing (subscription.not_renew)', () => {
    it('marks cancel-at-period-end without touching planStatus', async () => {
      const user = makeUser({
        subscriptions: [{ code: 'SUB_1', status: 'active' }],
      })
      const { service, userModel } = makeService()
      userModel.findOne.mockReturnValue(query(user))

      await service.markSubscriptionNonRenewing('CUS_1', 'SUB_1', 'TOKEN_1')

      expect(user.cancelAtPeriodEnd).toBe(true)
      // Critically: not a failure. The merchant keeps the tier they paid for.
      expect(user.planStatus).toBe('verified')
      expect(user.planGraceUntil).toBeUndefined()
      expect(user.subscriptions[0].status).toBe('non-renewing')
    })

    it('captures the email_token, which subscription.create never provides', async () => {
      const user = makeUser({
        subscriptions: [{ code: 'SUB_1', status: 'active' }],
      })
      const { service, userModel } = makeService()
      userModel.findOne.mockReturnValue(query(user))

      await service.markSubscriptionNonRenewing('CUS_1', 'SUB_1', 'TOKEN_1')

      expect(user.subscriptions[0].emailToken).toBe('TOKEN_1')
    })

    it('does not cancel the merchant when another subscription is live', async () => {
      // The old subscription retired by an upgrade arrives here as not_renew.
      const user = makeUser({
        subscriptions: [
          { code: 'SUB_old', status: 'cancelling' },
          { code: 'SUB_new', status: 'active' },
        ],
      })
      const { service, userModel } = makeService()
      userModel.findOne.mockReturnValue(query(user))

      await service.markSubscriptionNonRenewing('CUS_1', 'SUB_old')

      expect(user.cancelAtPeriodEnd).toBe(false)
    })
  })

  describe('markSubscriptionEnded (subscription.disable)', () => {
    it('records the ended subscription without opening a grace window', async () => {
      const user = makeUser({
        subscriptions: [{ code: 'SUB_1', status: 'non-renewing' }],
      })
      const { service, userModel } = makeService()
      userModel.findOne.mockReturnValue(query(user))

      await service.markSubscriptionEnded('CUS_1', 'SUB_1', 'complete')

      expect(user.subscriptions[0].status).toBe('complete')
      expect(user.planStatus).toBe('verified')
      // Entitlement falls out of cancelAtPeriodEnd + period end, not a lapse.
      expect(user.planGraceUntil).toBeUndefined()
      expect(user.cancelAtPeriodEnd).toBe(true)
    })

    it('leaves the merchant alone when another subscription is live', async () => {
      const user = makeUser({
        subscriptions: [
          { code: 'SUB_old', status: 'cancelling' },
          { code: 'SUB_new', status: 'active' },
        ],
      })
      const { service, userModel } = makeService()
      userModel.findOne.mockReturnValue(query(user))

      await service.markSubscriptionEnded('CUS_1', 'SUB_old', 'complete')

      expect(user.cancelAtPeriodEnd).toBe(false)
      expect(user.planStatus).toBe('verified')
    })
  })
})

describe('retiring a subscription records intent before calling Paystack', () => {
  afterEach(() => jest.clearAllMocks())

  /** Records the order of save() vs disableSubscription() calls. */
  const withCallLog = () => {
    const calls: string[] = []
    const sub = { code: 'SUB_old', status: 'active', emailToken: 'TOK' }
    const user = makeUser({
      subscriptions: [sub],
      save: jest.fn().mockImplementation(function (this: void) {
        calls.push(`save:${sub.status}`)
        return Promise.resolve(undefined)
      }),
    })
    return { calls, sub, user }
  }

  it('persists "cancelling" before disabling, on the supersede path', async () => {
    const { calls, sub, user } = withCallLog()
    const { service, userModel, paystackService } = makeService()
    userModel.findOne.mockReturnValue(query(user))
    paystackService.disableSubscription.mockImplementation(() => {
      calls.push('paystack:disable')
      return Promise.resolve({ success: true })
    })

    await service.supersedePreviousSubscriptions('CUS_1', 'SUB_new')

    // The webhook fired by disable must never beat the local write.
    expect(calls).toEqual([
      'save:cancelling',
      'paystack:disable',
      'save:cancelled',
    ])
    expect(sub.status).toBe('cancelled')
  })

  it('restores the status when Paystack refuses to disable', async () => {
    const { sub, user } = withCallLog()
    const { service, userModel, paystackService } = makeService()
    userModel.findOne.mockReturnValue(query(user))
    paystackService.disableSubscription.mockRejectedValue(new Error('nope'))

    await service.supersedePreviousSubscriptions('CUS_1', 'SUB_new')

    // Still live on Paystack, so it must not be treated as retired.
    expect(sub.status).toBe('active')
  })

  it('persists "cancelling" before disabling, on the cancel path', async () => {
    const { calls, user } = withCallLog()
    const { service, userModel, paystackService } = makeService()
    userModel.findById.mockReturnValue(query(user))
    paystackService.disableSubscription.mockImplementation(() => {
      calls.push('paystack:disable')
      return Promise.resolve({ success: true })
    })

    const result = await service.cancelSubscription('merchant-1')

    expect(calls.slice(0, 3)).toEqual([
      'save:cancelling',
      'paystack:disable',
      'save:cancelled',
    ])
    expect(user.cancelAtPeriodEnd).toBe(true)
    expect(result).toMatchObject({ success: true, cancelledCount: 1 })
    // Cancelling is not a payment failure.
    expect(user.planStatus).toBe('verified')
    expect(user.planGraceUntil).toBeUndefined()
  })
})

describe('renewPeriod', () => {
  afterEach(() => jest.clearAllMocks())

  const DAY = 24 * 60 * 60 * 1000
  const setup = (userOverrides: Record<string, any> = {}) => {
    const user = makeUser({
      planInterval: 'monthly',
      planCurrentPeriodEnd: new Date(Date.now() + DAY),
      planCurrentPeriodStart: new Date(Date.now() - 29 * DAY),
      ...userOverrides,
    })
    const ctx = makeService()
    ctx.userModel.findOne.mockReturnValue(query(user))
    return { ...ctx, user }
  }

  it("prefers Paystack's next_payment_date over local arithmetic", async () => {
    const { service, user } = setup()
    const paystackEnd = new Date(Date.now() + 31 * DAY)

    await service.renewPeriod('CUS_1', 'INV_1', paystackEnd.toISOString())

    expect(user.planCurrentPeriodEnd.toISOString()).toBe(
      paystackEnd.toISOString(),
    )
  })

  it('derives the period start from the end and the cadence', async () => {
    const { service, user } = setup({ planInterval: 'annually' })
    const paystackEnd = new Date('2027-06-15T00:00:00.000Z')

    await service.renewPeriod('CUS_1', 'INV_1', paystackEnd.toISOString())

    // A year long, not a month — the annual renewal bug in reverse.
    expect(user.planCurrentPeriodStart.toISOString()).toBe(
      '2026-06-15T00:00:00.000Z',
    )
  })

  it('falls back to local computation when no date is supplied', async () => {
    const previousEnd = new Date(Date.now() + DAY)
    const { service, user } = setup({ planCurrentPeriodEnd: previousEnd })

    await service.renewPeriod('CUS_1', 'INV_1')

    const expected = new Date(previousEnd)
    expected.setMonth(expected.getMonth() + 1)
    expect(user.planCurrentPeriodEnd.toISOString()).toBe(expected.toISOString())
  })

  it('discards a next_payment_date in the past', async () => {
    const previousEnd = new Date(Date.now() + DAY)
    const { service, user } = setup({ planCurrentPeriodEnd: previousEnd })

    await service.renewPeriod(
      'CUS_1',
      'INV_1',
      new Date(Date.now() - 10 * DAY).toISOString(),
    )

    expect(user.planCurrentPeriodEnd.getTime()).toBeGreaterThan(
      previousEnd.getTime(),
    )
  })

  it('discards an unparseable next_payment_date', async () => {
    const previousEnd = new Date(Date.now() + DAY)
    const { service, user } = setup({ planCurrentPeriodEnd: previousEnd })

    await service.renewPeriod('CUS_1', 'INV_1', 'not-a-date')

    expect(user.planCurrentPeriodEnd.getTime()).toBeGreaterThan(
      previousEnd.getTime(),
    )
  })

  it('does not stack periods when the same invoice arrives twice', async () => {
    // Paystack retries an unacknowledged webhook for 72 hours.
    const { service, user } = setup({ lastRenewalReference: 'INV_1' })
    const before = user.planCurrentPeriodEnd

    await service.renewPeriod(
      'CUS_1',
      'INV_1',
      new Date(Date.now() + 31 * DAY).toISOString(),
    )

    expect(user.planCurrentPeriodEnd).toBe(before)
  })

  it('clears the grace window and restores status after a lapse', async () => {
    const { service, user } = setup({
      planStatus: 'failed',
      planGraceUntil: new Date(Date.now() + 3 * DAY),
      kyc: {
        nin: { status: 'passed', product: 'enhanced_kyc' },
        bvn: { status: 'passed', product: 'biometric_kyc' },
      },
    })

    await service.renewPeriod('CUS_1', 'INV_1')

    expect(user.planGraceUntil).toBeUndefined()
    expect(user.planStatus).toBe('verified')
  })
})

describe('MerchantPlansService.verifyPayment', () => {
  afterEach(() => jest.clearAllMocks())

  // Paystack statuses that mean "still settling", not "failed". Common with
  // bank transfer and USSD, where the merchant returns to /plan-status before
  // the charge has landed.
  describe.each(['pending', 'ongoing', 'processing', 'queued'])(
    'in-flight status "%s"',
    (status) => {
      it('leaves the order PENDING instead of failing it', async () => {
        const { service, planOrderModel, paystackService } = makeService()
        paystackService.verifyTransaction.mockResolvedValue({
          status,
          amount: 600000,
        })

        const result = await service.verifyPayment('PLAN-abc')

        expect(result).toMatchObject({ success: false, status: 'PENDING' })
        expect(planOrderModel.updateOne).not.toHaveBeenCalled()
      })
    },
  )

  describe.each(['abandoned', 'failed', 'reversed'])(
    'terminal status "%s"',
    (status) => {
      it('marks the order FAILED', async () => {
        const { service, planOrderModel, paystackService } = makeService()
        paystackService.verifyTransaction.mockResolvedValue({ status })

        const result = await service.verifyPayment('PLAN-abc')

        expect(result).toMatchObject({ success: false, status: 'FAILED' })
        expect(planOrderModel.updateOne).toHaveBeenCalledWith(
          { paystackReference: 'PLAN-abc' },
          { paymentStatus: 'FAILED' },
        )
      })
    },
  )

  it('refuses to grant when the amount paid does not match the order', async () => {
    const order = makeOrder({ amount: 6000 }) // expects 600000 kobo
    const { service, planOrderModel, userModel, paystackService } = makeService()
    paystackService.verifyTransaction.mockResolvedValue({
      status: 'success',
      amount: 100, // ₦1 — nowhere near the plan price
    })
    planOrderModel.findOne.mockReturnValue(query(order))

    const result = await service.verifyPayment('PLAN-abc')

    expect(result).toMatchObject({ success: false, reason: 'amount_mismatch' })
    // Critically: no tier granted.
    expect(userModel.updateOne).not.toHaveBeenCalled()
    expect(planOrderModel.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('grants the tier when the amount matches', async () => {
    const order = makeOrder({ amount: 6000 })
    const { service, planOrderModel, userModel, paystackService } = makeService()
    paystackService.verifyTransaction.mockResolvedValue({
      status: 'success',
      amount: 600000,
      customerCode: 'CUS_1',
      authorizationCode: 'AUTH_1',
    })
    planOrderModel.findOne.mockReturnValue(query(order))
    planOrderModel.findOneAndUpdate.mockReturnValue(
      query({ ...order, paymentStatus: 'SUCCESSFUL' }),
    )

    const result = await service.verifyPayment('PLAN-abc')

    expect(result).toMatchObject({ success: true, status: 'SUCCESSFUL', tier: 'PRO' })
    expect(userModel.updateOne).toHaveBeenCalledTimes(1)
    const [, update] = userModel.updateOne.mock.calls[0]
    expect(update.$set).toMatchObject({
      planTier: 'PRO',
      planStatus: 'paid',
      planGraceUntil: null,
      cancelAtPeriodEnd: false,
      paystackCustomerCode: 'CUS_1',
    })
  })

  it('claims the order atomically so a racing caller cannot double-grant', async () => {
    const order = makeOrder()
    const { service, planOrderModel, userModel, paystackService } = makeService()
    paystackService.verifyTransaction.mockResolvedValue({
      status: 'success',
      amount: 600000,
    })
    planOrderModel.findOne.mockReturnValue(query(order))
    // Another caller already flipped it: the conditional update matches nothing.
    planOrderModel.findOneAndUpdate.mockReturnValue(query(null))

    const result = await service.verifyPayment('PLAN-abc')

    expect(planOrderModel.findOneAndUpdate).toHaveBeenCalledWith(
      { paystackReference: 'PLAN-abc', paymentStatus: { $ne: 'SUCCESSFUL' } },
      expect.objectContaining({ paymentStatus: 'SUCCESSFUL' }),
      expect.anything(),
    )
    expect(result).toMatchObject({ success: true, alreadyGranted: true })
    // The grant already happened — re-running it would create a second
    // Paystack subscription on the proration path.
    expect(userModel.updateOne).not.toHaveBeenCalled()
  })

  it('throws when no order matches the reference', async () => {
    const { service, planOrderModel, paystackService } = makeService()
    paystackService.verifyTransaction.mockResolvedValue({
      status: 'success',
      amount: 600000,
    })
    planOrderModel.findOne.mockReturnValue(query(null))

    await expect(service.verifyPayment('PLAN-nope')).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('scopes the lookup to the caller when one is supplied', async () => {
    const callerId = new Types.ObjectId().toString()
    const { service, planOrderModel, paystackService } = makeService()
    paystackService.verifyTransaction.mockResolvedValue({
      status: 'success',
      amount: 600000,
    })
    // No order matches this caller — it belongs to another merchant.
    planOrderModel.findOne.mockReturnValue(query(null))

    await expect(
      service.verifyPayment('PLAN-someone-elses', callerId),
    ).rejects.toBeInstanceOf(NotFoundException)

    const [filter] = planOrderModel.findOne.mock.calls[0]
    expect(String(filter.merchantId)).toBe(callerId)
  })

  it('does not scope when called without a caller (the webhook path)', async () => {
    const order = makeOrder()
    const { service, planOrderModel, paystackService } = makeService()
    paystackService.verifyTransaction.mockResolvedValue({
      status: 'success',
      amount: 600000,
    })
    planOrderModel.findOne.mockReturnValue(query(order))
    planOrderModel.findOneAndUpdate.mockReturnValue(query(order))

    await service.verifyPayment('PLAN-abc')

    const [filter] = planOrderModel.findOne.mock.calls[0]
    expect(filter).toEqual({ paystackReference: 'PLAN-abc' })
  })

  it('tolerates a missing amount rather than blocking the grant', async () => {
    // Defensive: if Paystack ever omits amount we should not hard-fail a
    // legitimate payment.
    const order = makeOrder()
    const { service, planOrderModel, userModel, paystackService } = makeService()
    paystackService.verifyTransaction.mockResolvedValue({ status: 'success' })
    planOrderModel.findOne.mockReturnValue(query(order))
    planOrderModel.findOneAndUpdate.mockReturnValue(query(order))

    const result = await service.verifyPayment('PLAN-abc')

    expect(result).toMatchObject({ success: true })
    expect(userModel.updateOne).toHaveBeenCalled()
  })
})
