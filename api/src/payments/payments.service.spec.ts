// PaymentsService pulls in QRKitsService, which imports the ESM-only nanoid.
// Jest does not transform node_modules, and this suite never exercises it.
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
  customAlphabet: () => () => 'TESTSER1',
}))

import { HttpException } from '@nestjs/common'
import { PaymentsService } from './payments.service'

/**
 * Fixtures are Paystack's own published webhook samples, trimmed to the fields
 * we read. They are the specification for this router — in particular that
 * invoice events NEST the subscription while subscription events do not, and
 * that charge.success carries neither a subscription code nor an email token.
 */
const PAYLOADS = {
  chargeSuccess: {
    event: 'charge.success',
    data: {
      reference: 'PLAN-abc-1699999999',
      amount: 10000,
      status: 'success',
      customer: { customer_code: 'CUS_qo38as2hpsgk2r0' },
      // Note: no subscription_code, no email_token, and plan is empty.
      plan: {},
    },
  },
  subscriptionCreate: {
    event: 'subscription.create',
    data: {
      status: 'active',
      subscription_code: 'SUB_vsyqdmlzble3uii',
      next_payment_date: '2016-05-19T07:00:00.000Z',
      plan: { plan_code: 'PLN_gx2wn530m0i3w3m', interval: 'monthly' },
      customer: { customer_code: 'CUS_xnxdt6s1zg1f4nx' },
      // Note: no email_token.
    },
  },
  subscriptionDisable: {
    event: 'subscription.disable',
    data: {
      status: 'complete',
      subscription_code: 'SUB_vsyqdmlzble3uii',
      email_token: 'ctt824k16n34u69',
      next_payment_date: '2020-11-26T15:00:00.000Z',
      customer: { customer_code: 'CUS_xnxdt6s1zg1f4nx' },
    },
  },
  subscriptionNotRenew: {
    event: 'subscription.not_renew',
    data: {
      status: 'non-renewing',
      subscription_code: 'SUB_d638sdiWAio7jnl',
      email_token: '086x99rmqc4qhcw',
      next_payment_date: null,
      customer: { customer_code: 'CUS_8gbmdpvn12c67ix' },
    },
  },
  invoicePaymentFailed: {
    event: 'invoice.payment_failed',
    data: {
      invoice_code: 'INV_3kfmqw48ca7b48k',
      status: 'pending',
      paid: false,
      subscription: {
        status: 'active',
        subscription_code: 'SUB_f7ct8g01mtcjf78',
        email_token: 'gptk4apuohyyjsg',
      },
      customer: { customer_code: 'CUS_3p3ylxyf07605kx' },
      transaction: {},
    },
  },
  invoiceUpdate: {
    event: 'invoice.update',
    data: {
      invoice_code: 'INV_kmhuaaur5c9ruh2',
      status: 'success',
      paid: true,
      period_start: '2016-04-19T07:00:00.000Z',
      period_end: '2016-05-19T07:00:00.000Z',
      subscription: {
        status: 'active',
        subscription_code: 'SUB_l07i1s6s39nmytr',
        next_payment_date: '2016-05-19T07:00:00.000Z',
      },
      customer: { customer_code: 'CUS_xnxdt6s1zg1f4nx' },
      transaction: { reference: 'rdtmivs7zf', status: 'success' },
    },
  },
}

const makeService = (validSignature = true) => {
  const paystackService = {
    verifyWebhookSignature: jest.fn(() => validSignature),
  }
  const qrKitsService = { completeActivationByWebhook: jest.fn() }
  const ordersService = { verifyPayment: jest.fn() }
  const merchantPlansService = {
    verifyPayment: jest.fn(),
    attachSubscriptionByCustomer: jest.fn(),
    supersedePreviousSubscriptions: jest.fn(),
    handleSubscriptionLapse: jest.fn(),
    markSubscriptionNonRenewing: jest.fn(),
    markSubscriptionEnded: jest.fn(),
    renewPeriod: jest.fn(),
  }
  const salesService = {
    confirmPaystackSale: jest.fn(),
  }
  const webhookEventModel = {
    updateOne: jest.fn(() => ({
      exec: jest.fn().mockResolvedValue({ acknowledged: true }),
    })),
    findOneAndUpdate: jest.fn(() => ({
      exec: jest.fn().mockResolvedValue(null),
    })),
  }
  const refundsService = { handleWebhook: jest.fn() }
  const disputesService = { handleWebhook: jest.fn() }

  const service = new PaymentsService(
    paystackService as any,
    qrKitsService as any,
    ordersService as any,
    merchantPlansService as any,
    salesService as any,
    webhookEventModel as any,
    refundsService as any,
    disputesService as any,
  )
  jest.spyOn((service as any).logger, 'error').mockImplementation(() => {})

  return {
    service,
    paystackService,
    qrKitsService,
    ordersService,
    merchantPlansService,
    salesService,
    webhookEventModel,
    refundsService,
    disputesService,
  }
}

/** Invokes the router directly — handleWebhook dispatches it in the background. */
const process = (service: PaymentsService, payload: any) =>
  (service as any).processEvent(payload.event, payload.data)

describe('PaymentsService.handleWebhook', () => {
  afterEach(() => jest.clearAllMocks())

  it('rejects a forged signature before doing any work', async () => {
    const { service, merchantPlansService } = makeService(false)

    await expect(
      service.handleWebhook(PAYLOADS.chargeSuccess, 'bad-sig', '{}'),
    ).rejects.toBeInstanceOf(HttpException)
    expect(merchantPlansService.verifyPayment).not.toHaveBeenCalled()
  })

  it('persists the event before acknowledging it', async () => {
    const { service, webhookEventModel } = makeService()
    const result = await service.handleWebhook(
      PAYLOADS.chargeSuccess,
      'sig',
      '{}',
    )

    expect(result).toEqual({ received: true })
    expect(webhookEventModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ eventKey: expect.any(String) }),
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          event: 'charge.success',
          status: 'pending',
        }),
      }),
      { upsert: true },
    )
  })

  it('uses the same event key when Paystack redelivers an identical body', async () => {
    const { service, webhookEventModel } = makeService()
    const rawBody = JSON.stringify(PAYLOADS.chargeSuccess)

    await service.handleWebhook(PAYLOADS.chargeSuccess, 'sig', rawBody)
    await service.handleWebhook(PAYLOADS.chargeSuccess, 'sig', rawBody)

    const firstFilter = (webhookEventModel.updateOne as any).mock.calls[0][0]
    const secondFilter = (webhookEventModel.updateOne as any).mock.calls[1][0]
    expect(firstFilter?.eventKey).toBe(secondFilter?.eventKey)
  })

  it('does not acknowledge when durable storage fails', async () => {
    const { service, webhookEventModel } = makeService()
    webhookEventModel.updateOne.mockReturnValueOnce({
      exec: jest.fn().mockRejectedValue(new Error('mongo unavailable')),
    } as any)

    await expect(
      service.handleWebhook(PAYLOADS.chargeSuccess, 'sig', '{}'),
    ).rejects.toThrow('mongo unavailable')
  })

  it('records a failed attempt for retry without losing the event', async () => {
    const { service, merchantPlansService, webhookEventModel } = makeService()
    merchantPlansService.verifyPayment.mockRejectedValue(new Error('boom'))
    const storedEvent = {
      _id: 'event-1',
      eventKey: 'key-1',
      event: PAYLOADS.chargeSuccess.event,
      data: PAYLOADS.chargeSuccess.data,
      status: 'processing',
      attempts: 1,
    }

    await (service as any).processStoredWebhook(storedEvent)

    expect(webhookEventModel.updateOne).toHaveBeenCalledWith(
      { _id: 'event-1', status: 'processing' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'failed',
          lastError: 'boom',
          nextAttemptAt: expect.any(Date),
        }),
      }),
    )
  })

  it('dead-letters an event after the final retry attempt', async () => {
    const { service, merchantPlansService, webhookEventModel } = makeService()
    merchantPlansService.verifyPayment.mockRejectedValue(new Error('boom'))

    await (service as any).processStoredWebhook({
      _id: 'event-10',
      eventKey: 'key-10',
      event: PAYLOADS.chargeSuccess.event,
      data: PAYLOADS.chargeSuccess.data,
      status: 'processing',
      attempts: 10,
    })

    expect(webhookEventModel.updateOne).toHaveBeenCalledWith(
      { _id: 'event-10', status: 'processing' },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'dead_letter' }),
      }),
    )
  })
})

describe('PaymentsService event routing', () => {
  afterEach(() => jest.clearAllMocks())

  it('routes refund lifecycle events to the refund processor', async () => {
    const { service, refundsService } = makeService()
    const data = { id: 42, status: 'processed', refund_reference: 'REF_123' }

    await process(service, { event: 'refund.processed', data })

    expect(refundsService.handleWebhook).toHaveBeenCalledWith(
      'refund.processed',
      data,
    )
  })

  it('routes dispute lifecycle events to the dispute processor', async () => {
    const { service, disputesService } = makeService()
    const data = { id: 91, status: 'awaiting-merchant-feedback' }

    await process(service, { event: 'charge.dispute.create', data })

    expect(disputesService.handleWebhook).toHaveBeenCalledWith(
      'charge.dispute.create',
      data,
    )
  })

  it('routes a PLAN- charge to plan verification only', async () => {
    const { service, merchantPlansService, qrKitsService, ordersService } =
      makeService()

    await process(service, PAYLOADS.chargeSuccess)

    expect(merchantPlansService.verifyPayment).toHaveBeenCalledWith(
      'PLAN-abc-1699999999',
    )
    // charge.success has no subscription_code, so there is nothing to attach.
    expect(
      merchantPlansService.attachSubscriptionByCustomer,
    ).not.toHaveBeenCalled()
    expect(qrKitsService.completeActivationByWebhook).not.toHaveBeenCalled()
    expect(ordersService.verifyPayment).not.toHaveBeenCalled()
  })

  it('falls through to QR kit activation for an unprefixed reference', async () => {
    const { service, qrKitsService } = makeService()

    await process(service, {
      event: 'charge.success',
      data: { reference: 'somekitref', customer: {} },
    })

    expect(qrKitsService.completeActivationByWebhook).toHaveBeenCalledWith(
      'somekitref',
      { reference: 'somekitref', customer: {} },
    )
  })

  it('records and supersedes on subscription.create', async () => {
    const { service, merchantPlansService } = makeService()

    await process(service, PAYLOADS.subscriptionCreate)

    expect(
      merchantPlansService.attachSubscriptionByCustomer,
    ).toHaveBeenCalledWith(
      'CUS_xnxdt6s1zg1f4nx',
      'SUB_vsyqdmlzble3uii',
      undefined, // Paystack does not send email_token on this event
      { planCode: 'PLN_gx2wn530m0i3w3m', interval: 'monthly' },
    )
    expect(
      merchantPlansService.supersedePreviousSubscriptions,
    ).toHaveBeenCalled()
  })

  it('reads the NESTED subscription code on invoice.payment_failed', async () => {
    const { service, merchantPlansService } = makeService()

    await process(service, PAYLOADS.invoicePaymentFailed)

    expect(merchantPlansService.handleSubscriptionLapse).toHaveBeenCalledWith(
      'CUS_3p3ylxyf07605kx',
      'SUB_f7ct8g01mtcjf78',
    )
  })

  it('treats not_renew as a cancellation, never as a lapse', async () => {
    const { service, merchantPlansService } = makeService()

    await process(service, PAYLOADS.subscriptionNotRenew)

    expect(
      merchantPlansService.markSubscriptionNonRenewing,
    ).toHaveBeenCalledWith(
      'CUS_8gbmdpvn12c67ix',
      'SUB_d638sdiWAio7jnl',
      '086x99rmqc4qhcw',
    )
    // The regression this whole change exists to prevent.
    expect(merchantPlansService.handleSubscriptionLapse).not.toHaveBeenCalled()
  })

  it('treats disable as the subscription ending, never as a lapse', async () => {
    const { service, merchantPlansService } = makeService()

    await process(service, PAYLOADS.subscriptionDisable)

    expect(merchantPlansService.markSubscriptionEnded).toHaveBeenCalledWith(
      'CUS_xnxdt6s1zg1f4nx',
      'SUB_vsyqdmlzble3uii',
      'complete',
    )
    expect(merchantPlansService.handleSubscriptionLapse).not.toHaveBeenCalled()
  })

  it("renews on invoice.update, passing Paystack's next payment date", async () => {
    const { service, merchantPlansService } = makeService()

    await process(service, PAYLOADS.invoiceUpdate)

    expect(merchantPlansService.renewPeriod).toHaveBeenCalledWith(
      'CUS_xnxdt6s1zg1f4nx',
      'INV_kmhuaaur5c9ruh2',
      '2016-05-19T07:00:00.000Z',
    )
  })

  it('ignores invoice.payment_succeeded, which Paystack never sends', async () => {
    const { service, merchantPlansService } = makeService()

    await process(service, {
      ...PAYLOADS.invoiceUpdate,
      event: 'invoice.payment_succeeded',
    })

    expect(merchantPlansService.renewPeriod).not.toHaveBeenCalled()
  })

  it('does not renew on an unpaid invoice.update', async () => {
    const { service, merchantPlansService } = makeService()

    await process(service, {
      event: 'invoice.update',
      data: { status: 'pending', paid: false, customer: {} },
    })

    expect(merchantPlansService.renewPeriod).not.toHaveBeenCalled()
  })

  it('routes a COL- charge to salesService.confirmPaystackSale', async () => {
    const { service, salesService, qrKitsService } = makeService()
    const payloadData = {
      reference: 'COL-123456789012',
      amount: 500000,
      channel: 'card',
    }

    await process(service, {
      event: 'charge.success',
      data: payloadData,
    })

    expect(salesService.confirmPaystackSale).toHaveBeenCalledWith(
      'COL-123456789012',
      payloadData,
    )
    expect(qrKitsService.completeActivationByWebhook).not.toHaveBeenCalled()
  })
})
