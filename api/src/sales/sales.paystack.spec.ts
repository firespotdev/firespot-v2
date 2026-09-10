import { Types } from 'mongoose'
import { SalesService } from './sales.service'

jest.mock('nanoid', () => ({ nanoid: () => 'TEST1234' }))

const query = <T>(value: T) => {
  const q: any = {
    exec: jest.fn().mockResolvedValue(value),
  }
  q.select = jest.fn(() => q)
  return q
}

const sortedQuery = <T>(value: T) => ({
  sort: jest.fn(() => query(value)),
})

const chain = <T>(value: T) => {
  const selected = {
    exec: jest.fn().mockResolvedValue(value),
    limit: jest.fn(() => query(value)),
  }
  return { select: jest.fn(() => selected) }
}

function makeService(overrides: Record<string, any> = {}) {
  const server = { to: jest.fn(), emit: jest.fn() }
  server.to.mockReturnValue(server)
  const saleModel = {
    find: jest.fn(() => chain([])),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findById: jest.fn(),
    ...overrides.saleModel,
  }
  const userModel = {
    findById: jest.fn(),
    updateOne: jest.fn(() => query({ modifiedCount: 0 })),
    ...overrides.userModel,
  }
  const dailyUsageModel = {
    findOne: jest.fn(() => query(null)),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    ...overrides.dailyUsageModel,
  }
  const customersService = {
    findOrCreateForUser: jest.fn(),
    ...overrides.customersService,
  }
  const referrals = {
    evaluateReferredMerchant: jest.fn().mockResolvedValue(undefined),
  }
  const defaultAttemptInstance = { save: jest.fn().mockResolvedValue(true) }
  const attemptConstructor = jest.fn(() => defaultAttemptInstance) as any
  attemptConstructor.findOne = jest.fn(() => query(null))
  attemptConstructor.findOneAndUpdate = jest.fn()
  attemptConstructor.updateOne = jest.fn()
  const paymentAttemptModel = typeof overrides.paymentAttemptModel === 'function'
    ? overrides.paymentAttemptModel
    : Object.assign(attemptConstructor, overrides.paymentAttemptModel)
  const paystackService = {
    initializeTransaction: jest.fn(),
    verifyTransaction: jest.fn(),
    chargeAuthorization: jest.fn(),
    ...overrides.paystackService,
  }
  const smsService = {
    sendSms: jest.fn().mockResolvedValue({ status: 'sent' }),
    isMockEnabled: jest.fn().mockReturnValue(false),
    ...overrides.smsService,
  }
  const service = new SalesService(
    saleModel as any,
    userModel as any,
    {} as any,
    {} as any,
    { server } as any,
    {} as any,
    {} as any,
    {} as any,
    customersService as any,
    referrals as any,
    paystackService as any,
    smsService as any,
    dailyUsageModel as any,
    paymentAttemptModel as any,
  )
  jest.spyOn((service as any).logger, 'error').mockImplementation(() => {})
  jest.spyOn((service as any).logger, 'log').mockImplementation(() => {})
  return {
    service,
    saleModel,
    dailyUsageModel,
    paymentAttemptModel,
    paystackService,
    smsService,
    userModel,
    customersService,
    referrals,
    server,
  }
}

const makePendingSale = (overrides: Record<string, any> = {}) => ({
  _id: new Types.ObjectId(),
  merchantId: new Types.ObjectId(),
  status: 'PENDING',
  amount: 5000,
  channel: 'card',
  capReservationDay: '2026-08-09',
  capReservationAmount: 5000,
  ...overrides,
})

describe('SalesService Paystack collection integrity', () => {
  it('rejects an authenticated merchant initializing payment to their own account', async () => {
    const merchantId = new Types.ObjectId()
    const sale = makePendingSale({
      merchantId,
      isCollection: true,
      serialNumber: 'FS-QR-1',
      customerFingerprint: 'merchant-browser',
    })
    const { service, saleModel } = makeService({
      saleModel: {
        findOne: jest.fn(() => query(sale)),
        findOneAndUpdate: jest.fn(),
      },
    })

    await expect(
      service.initializeExistingPaystackSale(
        sale._id.toString(),
        {
          serialNumber: 'FS-QR-1',
          channel: 'card',
          customerFingerprint: 'merchant-browser',
        },
        merchantId.toString(),
      ),
    ).rejects.toThrow("You can't pay your own account")
    expect(saleModel.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('counts only collection sales recorded inside the Lagos collection day', async () => {
    const merchantId = new Types.ObjectId()
    const saleModel = {
      find: jest.fn(() =>
        chain([
          { status: 'CONFIRMED', amount: 12000, amountPaid: 12000 },
          { status: 'OUTSTANDING', amount: 10000, amountPaid: 3000 },
        ]),
      ),
    }
    const { service } = makeService({ saleModel })
    const start = new Date('2026-08-09T00:00:00.000+01:00')
    const end = new Date('2026-08-10T00:00:00.000+01:00')

    await expect(
      (service as any).recordedAmountForDay(merchantId, start, end),
    ).resolves.toBe(15000)
    expect(saleModel.find).toHaveBeenCalledWith({
      merchantId,
      isCollection: true,
      status: { $in: ['CONFIRMED', 'OUTSTANDING'] },
      recordedAt: { $gte: start, $lt: end },
    })
  })

  it('returns a customer-safe cap error and texts the merchant the remaining allowance', async () => {
    const merchant = {
      _id: new Types.ObjectId(),
      planTier: 'LITE',
      planStatus: 'verified',
      fullPhoneNumber: '+2348031234567',
    }
    const saleModel = {
      find: jest
        .fn()
        .mockReturnValueOnce(chain([]))
        .mockReturnValueOnce(
          chain([{ status: 'CONFIRMED', amountPaid: 10000 }]),
        ),
    }
    const { service, smsService } = makeService({
      saleModel,
      userModel: {
        updateOne: jest.fn(() => query({ modifiedCount: 1 })),
      },
      dailyUsageModel: {
        findOneAndUpdate: jest.fn(() => query(null)),
        findOne: jest.fn(() => query({ reservedAmount: 20000 })),
      },
    })

    try {
      await (service as any).reservePaystackDailyCap(merchant, 21000)
      throw new Error('Expected the collection reservation to fail')
    } catch (error) {
      expect((error as { getResponse: () => unknown }).getResponse()).toEqual({
        code: 'PAYMENT_UNAVAILABLE',
        message: 'Payment failed. Please try another payment method',
      })
    }

    expect(smsService.sendSms).toHaveBeenCalledWith(
      merchant.fullPhoneNumber,
      expect.stringContaining(
        'A ₦21,000 payment failed because only ₦20,000 remains',
      ),
    )
    expect(smsService.sendSms).toHaveBeenCalledWith(
      merchant.fullPhoneNumber,
      expect.stringContaining('₦50,000 LITE daily collection limit'),
    )
  })

  it('atomically limits the merchant cap SMS to one alert per rolling 24 hours', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-09T12:00:00.000Z'))
    const merchant = {
      _id: new Types.ObjectId(),
      fullPhoneNumber: '+2348031234567',
    }
    const updateOne = jest
      .fn()
      .mockReturnValueOnce(query({ modifiedCount: 1 }))
      .mockReturnValueOnce(query({ modifiedCount: 0 }))
    const { service, smsService } = makeService({
      userModel: { updateOne },
    })
    const alert = {
      merchant,
      tier: 'LITE',
      cap: 50000,
      attemptedAmount: 21000,
      remainingAmount: 20000,
    }

    await (service as any).notifyMerchantOfCollectionLimit(alert)
    await (service as any).notifyMerchantOfCollectionLimit(alert)

    expect(smsService.sendSms).toHaveBeenCalledTimes(1)
    expect(updateOne).toHaveBeenNthCalledWith(
      1,
      {
        _id: merchant._id,
        $or: [
          { lastDailyLimitAlertAt: { $exists: false } },
          {
            lastDailyLimitAlertAt: {
              $lte: new Date('2026-08-08T12:00:00.000Z'),
            },
          },
        ],
      },
      { $set: { lastDailyLimitAlertAt: new Date('2026-08-09T12:00:00.000Z') } },
    )
    jest.useRealTimers()
  })

  it('logs every merchant cap alert in mock mode without using the production throttle', async () => {
    const merchant = {
      _id: new Types.ObjectId(),
      fullPhoneNumber: '+2348031234567',
    }
    const updateOne = jest.fn(() => query({ modifiedCount: 0 }))
    const { service, smsService } = makeService({
      userModel: { updateOne },
      smsService: { isMockEnabled: jest.fn().mockReturnValue(true) },
    })
    const alert = {
      merchant,
      tier: 'LITE',
      cap: 50000,
      attemptedAmount: 21000,
      remainingAmount: 20000,
    }

    await (service as any).notifyMerchantOfCollectionLimit(alert)
    await (service as any).notifyMerchantOfCollectionLimit(alert)

    expect(smsService.sendSms).toHaveBeenCalledTimes(2)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('uses a stable opaque payer alias instead of a merchant identity', () => {
    const { service } = makeService()
    const first = (service as any).payerEmailAlias('user:123')
    const second = (service as any).payerEmailAlias('user:123')
    const different = (service as any).payerEmailAlias('user:456')

    expect(first).toBe(second)
    expect(first).toMatch(/^payer\+[a-f0-9]{32}@firespot\.co$/)
    expect(first).not.toBe(different)
    expect(first).not.toContain('123')
  })

  it('returns Paystack to the original dynamic sale flow', () => {
    const previousFrontendUrl = process.env.FRONTEND_URL
    process.env.FRONTEND_URL = 'https://app.firespot.test/'
    const { service } = makeService()
    const sale = makePendingSale({ serialNumber: 'FS QR/1' })

    expect((service as any).paystackCallbackUrl(sale)).toBe(
      `https://app.firespot.test/pay/FS%20QR%2F1?saleId=${sale._id.toString()}&payment=paystack-return`,
    )

    if (previousFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL
    } else {
      process.env.FRONTEND_URL = previousFrontendUrl
    }
  })

  it('rejects a success webhook when status or amount is missing', async () => {
    const sale = makePendingSale()
    const { service, saleModel } = makeService({
      saleModel: { findOne: jest.fn(() => query(sale)) },
    })

    await expect(
      service.confirmPaystackSale('COL-1', { status: 'success' }),
    ).resolves.toBeNull()
    await expect(
      service.confirmPaystackSale('COL-1', { amount: 500000 }),
    ).resolves.toBeNull()
    expect(saleModel.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('atomically confirms once and records normal accounting fields', async () => {
    const pending = makePendingSale()
    const confirmed = {
      ...pending,
      status: 'CONFIRMED',
      capReservationStatus: 'confirmed',
      paystackAuthorizationDetails: {
        authorizationCode: 'AUTH_PRIVATE',
        reusable: true,
      },
      save: jest.fn().mockResolvedValue(undefined),
    }
    const { service, saleModel, dailyUsageModel, referrals, server } =
      makeService({
        saleModel: {
          findOne: jest.fn(() => query(pending)),
          findOneAndUpdate: jest.fn(() => query(confirmed)),
        },
      })

    const result = await service.confirmPaystackSale('COL-1', {
      status: 'success',
      reference: 'COL-1',
      amount: 500000,
      currency: 'NGN',
      fees: 12345,
      domain: 'test',
      channel: 'card',
      paid_at: '2026-08-09T12:00:00.000Z',
    })

    expect(result).toBe(confirmed)
    expect(saleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: pending._id, status: 'PENDING' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'CONFIRMED',
          paymentMethod: 'Card',
          paystackFee: 123.45,
          paystackCurrency: 'NGN',
          paystackDomain: 'test',
          amountPaid: 5000,
          totalDue: 5000,
          balanceOwed: 0,
          isPaidInFull: true,
        }),
      }),
      { returnDocument: 'after' },
    )
    expect(dailyUsageModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ dayKey: '2026-08-09' }),
      { $inc: { reservedAmount: -5000 } },
    )
    expect(referrals.evaluateReferredMerchant).toHaveBeenCalledTimes(1)
    expect(server.emit).toHaveBeenCalledWith(
      'sale.confirmed',
      expect.not.objectContaining({ paystackAuthorizationDetails: expect.anything() }),
    )
  })

  it('allows only one concurrent daily-cap reservation to win', async () => {
    const merchant = {
      _id: new Types.ObjectId(),
      planTier: 'LITE',
      planStatus: 'verified',
    }
    const { service, dailyUsageModel } = makeService({
      dailyUsageModel: {
        findOneAndUpdate: jest
          .fn()
          .mockReturnValueOnce(query({ reservedAmount: 40000 }))
          .mockReturnValueOnce(query(null)),
      },
    })

    await expect(
      (service as any).reservePaystackDailyCap(merchant, 40000),
    ).resolves.toMatch(/^\d{4}-\d{2}-\d{2}$/)
    await expect(
      (service as any).reservePaystackDailyCap(merchant, 20000),
    ).rejects.toThrow('Payment failed. Please try another payment method')
    expect(dailyUsageModel.findOneAndUpdate).toHaveBeenCalledTimes(2)
  })

  it('initializes Paystack on the existing dynamic sale instead of creating another sale', async () => {
    const sale = makePendingSale({
      isCollection: true,
      serialNumber: 'FS-QR-1',
      customerFingerprint: 'payer-1',
    })
    const claimedSale = { ...sale, paymentRail: 'paystack' }
    const merchant = {
      _id: sale.merchantId,
      paystackSubaccountCode: 'ACCT_test',
    }
    const { service, saleModel } = makeService({
      saleModel: {
        findOne: jest.fn(() => query(sale)),
        findOneAndUpdate: jest.fn(() => query(claimedSale)),
      },
      userModel: { findById: jest.fn(() => query(merchant)) },
      paymentAttemptModel: { findOne: jest.fn(() => sortedQuery(null)) },
    })
    const initialized = {
      sale: claimedSale,
      authorizationUrl: 'https://checkout.paystack.com/test',
      accessCode: 'access-code',
      paystackReference: 'COL-TEST1234',
    }
    const initialize = jest
      .spyOn(service as any, 'initializePaystackForSale')
      .mockResolvedValue(initialized)

    await expect(
      service.initializeExistingPaystackSale(
        sale._id.toString(),
        {
          serialNumber: 'fs-qr-1',
          channel: 'card',
          customerFingerprint: 'payer-1',
        },
        undefined,
      ),
    ).resolves.toBe(initialized)

    expect(saleModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: sale._id, status: 'PENDING' }),
      expect.objectContaining({
        $set: expect.objectContaining({
          paymentRail: 'paystack',
          paystackAttemptStatus: 'initializing',
        }),
      }),
      { returnDocument: 'after' },
    )
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ sale: claimedSale, merchant, channel: 'card' }),
    )
  })

  it('reuses an active Paystack checkout on repeated dynamic-sale taps', async () => {
    const sale = makePendingSale({
      isCollection: true,
      serialNumber: 'FS-QR-1',
    })
    const attempt = {
      reference: 'COL-EXISTING',
      authorizationUrl: 'https://checkout.paystack.com/existing',
      accessCode: 'existing-code',
    }
    const { service, saleModel } = makeService({
      saleModel: { findOne: jest.fn(() => query(sale)) },
      paymentAttemptModel: {
        findOne: jest.fn(() => sortedQuery(attempt)),
      },
    })

    await expect(
      service.initializeExistingPaystackSale(sale._id.toString(), {
        serialNumber: 'FS-QR-1',
      }),
    ).resolves.toEqual({
      sale,
      authorizationUrl: attempt.authorizationUrl,
      accessCode: attempt.accessCode,
      paystackReference: attempt.reference,
    })
    expect(saleModel.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('server-verifies the callback return and routes success through automatic confirmation', async () => {
    const sale = makePendingSale({
      isCollection: true,
      serialNumber: 'FS-QR-1',
      paymentRail: 'paystack',
      paystackAttemptStatus: 'pending',
      customerFingerprint: 'payer-1',
    })
    const attempt = { reference: 'COL-RETURN' }
    const confirmed = { ...sale, status: 'CONFIRMED' }
    const { service, paystackService } = makeService({
      saleModel: { findOne: jest.fn(() => query(sale)) },
      paymentAttemptModel: {
        findOne: jest.fn(() => sortedQuery(attempt)),
      },
      paystackService: {
        verifyTransaction: jest.fn().mockResolvedValue({
          status: 'success',
          reference: 'COL-RETURN',
          amount: 500000,
          currency: 'NGN',
          fees: 12345,
          domain: 'test',
          channel: 'card',
          paidAt: '2026-08-09T12:00:00.000Z',
        }),
      },
    })
    const confirm = jest
      .spyOn(service, 'confirmPaystackSale')
      .mockResolvedValue(confirmed as any)

    await expect(
      service.reconcilePaystackSale(sale._id.toString(), {
        serialNumber: 'FS-QR-1',
        customerFingerprint: 'payer-1',
      }),
    ).resolves.toBe(confirmed)
    expect(paystackService.verifyTransaction).toHaveBeenCalledWith('COL-RETURN')
    expect(confirm).toHaveBeenCalledWith(
      'COL-RETURN',
      expect.objectContaining({ status: 'success', amount: 500000 }),
    )
  })

  it('blocks merchant recording while Paystack is responsible for confirmation', async () => {
    const sale = makePendingSale({ paymentRail: 'paystack' })
    const { service } = makeService({
      saleModel: { findOne: jest.fn().mockResolvedValue(sale) },
    })

    await expect(
      service.recordSale(sale.merchantId.toString(), sale._id.toString(), {
        amount: sale.amount,
        paymentMethod: 'Bank Transfer',
        isPaidInFull: true,
      }),
    ).rejects.toThrow(
      'Paystack payments are recorded automatically after Paystack confirms receipt of funds.',
    )
  })

  describe('personal customer saved cards (Paystack tokenization)', () => {
    it('saves a reusable card from a confirmed Paystack card sale', async () => {
      const saleId = new Types.ObjectId()
      const userId = new Types.ObjectId()
      const sale = {
        _id: saleId,
        customerUserId: userId,
        status: 'CONFIRMED',
        paymentRail: 'paystack',
        channel: 'card',
        paystackAuthorizationDetails: {
          authorizationCode: 'AUTH_TEST123',
          brand: 'visa',
          last4: '4081',
          bank: 'Test Bank',
          reusable: true,
          signature: 'SIG_CARD_1',
        },
        save: jest.fn().mockResolvedValue(true),
      }
      const user = {
        _id: userId,
        savedCards: [],
        save: jest.fn().mockResolvedValue(true),
      }

      const { service } = makeService({
        saleModel: { findById: jest.fn(() => query(sale)) },
        userModel: { findById: jest.fn(() => query(user)) },
      })

      const result = await service.saveCardFromSale(
        saleId.toString(),
        userId.toString(),
      )

      expect(result.success).toBe(true)
      expect(result.card?.last4).toBe('4081')
      expect(user.savedCards).toHaveLength(1)
      expect(user.save).toHaveBeenCalled()
    })

    it('rejects saving a card if reusable is false', async () => {
      const saleId = new Types.ObjectId()
      const userId = new Types.ObjectId()
      const sale = {
        _id: saleId,
        customerUserId: userId,
        status: 'CONFIRMED',
        paystackAuthorizationDetails: {
          authorizationCode: 'AUTH_ONE_TIME',
          reusable: false,
        },
      }

      const { service } = makeService({
        saleModel: { findById: jest.fn(() => query(sale)) },
      })

      await expect(
        service.saveCardFromSale(saleId.toString(), userId.toString()),
      ).rejects.toThrow('No reusable card was used for this payment')
    })

    it('charges a saved card via chargeAuthorization with subaccount and bearer: subaccount', async () => {
      const saleId = new Types.ObjectId()
      const userId = new Types.ObjectId()
      const cardId = new Types.ObjectId()
      const merchantId = new Types.ObjectId()

      const sale = {
        _id: saleId,
        merchantId,
        customerUserId: userId,
        amount: 5000,
        status: 'PENDING',
        serialNumber: 'FS-TEST',
        reference: 'FS-REF',
        save: jest.fn().mockResolvedValue(true),
      }

      const merchant = {
        _id: merchantId,
        planTier: 'PRO',
        planStatus: 'verified',
        paystackSubaccountCode: 'ACCT_MERCHANT_1',
        bankAccounts: [{ isPrimary: true }],
      }

      const user = {
        _id: userId,
        fullPhoneNumber: '+2348011112222',
        firstName: 'Test',
        lastName: 'Customer',
        savedCards: [
          {
            _id: cardId,
            authorizationCode: 'AUTH_TEST123',
            brand: 'visa',
            last4: '4081',
            reusable: true,
          },
        ],
      }

      const attempt = {
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(true),
      }

      const paymentAttemptModel = jest.fn(() => attempt) as any
      paymentAttemptModel.findOne = jest.fn(() => query(null))
      paymentAttemptModel.findOneAndUpdate = jest.fn()

      const { service, paystackService, userModel } = makeService({
        saleModel: {
          findById: jest.fn(() => query(sale)),
          findOneAndUpdate: jest.fn(() => query(sale)),
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        },
        userModel: {
          findById: jest.fn((id) => {
            if (String(id) === String(merchantId)) return query(merchant)
            if (String(id) === String(userId)) return query(user)
            return query(null)
          }),
        },
        paymentAttemptModel,
        paystackService: {
          chargeAuthorization: jest.fn().mockResolvedValue({
            success: true,
            reference: 'COL-CHARGE-1',
          }),
          verifyTransaction: jest.fn().mockResolvedValue({
            status: 'success',
            amount: 500000,
            channel: 'card',
            currency: 'NGN',
            domain: 'test',
          }),
        },
      })

      jest.spyOn(service as any, 'reservePaystackDailyCap').mockResolvedValue('2026-09-09')
      jest.spyOn(service, 'confirmPaystackSale').mockResolvedValue({
        ...sale,
        status: 'CONFIRMED',
      } as any)

      const result = await service.payWithSavedCard(
        saleId.toString(),
        { cardId: cardId.toString() },
        userId.toString(),
      )

      expect(result.status).toBe('CONFIRMED')
      expect(paystackService.chargeAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({
          authorizationCode: 'AUTH_TEST123',
          amount: 500000,
          subaccount: 'ACCT_MERCHANT_1',
          bearer: 'subaccount',
        }),
      )
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: userId },
        { $set: { 'savedCards.$[card].lastUsedAt': expect.any(Date) } },
        { arrayFilters: [{ 'card._id': cardId }] },
      )
    })

    it('rejects saving a card from a sale owned by another customer', async () => {
      const saleId = new Types.ObjectId()
      const ownerId = new Types.ObjectId()
      const attackerId = new Types.ObjectId()
      const sale = {
        _id: saleId,
        status: 'CONFIRMED',
        customerUserId: ownerId,
        paystackAuthorizationDetails: {
          authorizationCode: 'AUTH_OWNER',
          reusable: true,
        },
      }
      const { service, userModel } = makeService({
        saleModel: { findById: jest.fn(() => query(sale)) },
      })

      await expect(
        service.saveCardFromSale(
          saleId.toString(),
          attackerId.toString(),
          'attacker-browser',
        ),
      ).rejects.toThrow('This payment belongs to another customer')
      expect(userModel.findById).not.toHaveBeenCalled()
    })

    it('claims a guest card payment only with its matching fingerprint', async () => {
      const saleId = new Types.ObjectId()
      const userId = new Types.ObjectId()
      const sale = {
        _id: saleId,
        status: 'CONFIRMED',
        customerFingerprint: 'guest-browser',
        paystackAuthorizationDetails: {
          authorizationCode: 'AUTH_GUEST',
          reusable: true,
        },
      }
      const user = {
        _id: userId,
        savedCards: [],
        save: jest.fn().mockResolvedValue(true),
      }
      const saleModel = {
        findById: jest.fn(() => query(sale)),
        findOneAndUpdate: jest.fn(() => query({ ...sale, customerUserId: userId })),
      }
      const { service } = makeService({
        saleModel,
        userModel: { findById: jest.fn(() => query(user)) },
      })

      await expect(
        service.saveCardFromSale(
          saleId.toString(),
          userId.toString(),
          'guest-browser',
        ),
      ).resolves.toEqual(expect.objectContaining({ success: true }))
      expect(saleModel.findOneAndUpdate).toHaveBeenCalled()
    })

    it('rejects a guest card save from a different browser fingerprint', async () => {
      const saleId = new Types.ObjectId()
      const userId = new Types.ObjectId()
      const sale = {
        _id: saleId,
        status: 'CONFIRMED',
        customerFingerprint: 'payer-browser',
        paystackAuthorizationDetails: {
          authorizationCode: 'AUTH_GUEST',
          reusable: true,
        },
      }
      const { service, saleModel, userModel } = makeService({
        saleModel: { findById: jest.fn(() => query(sale)) },
      })

      await expect(
        service.saveCardFromSale(
          saleId.toString(),
          userId.toString(),
          'different-browser',
        ),
      ).rejects.toThrow('This payment belongs to another customer')
      expect(saleModel.findOneAndUpdate).not.toHaveBeenCalled()
      expect(userModel.findById).not.toHaveBeenCalled()
    })

    it('blocks saved-card checkout when the merchant has opted out', async () => {
      const saleId = new Types.ObjectId()
      const userId = new Types.ObjectId()
      const merchantId = new Types.ObjectId()
      const cardId = new Types.ObjectId()
      const sale = {
        _id: saleId,
        merchantId,
        customerUserId: userId,
        status: 'PENDING',
        amount: 5000,
      }
      const customer = {
        _id: userId,
        savedCards: [
          {
            _id: cardId,
            authorizationCode: 'AUTH_TEST123',
            reusable: true,
          },
        ],
      }
      const merchant = {
        _id: merchantId,
        planTier: 'PRO',
        planStatus: 'verified',
        paystackSubaccountCode: 'ACCT_MERCHANT_1',
        savedCardsCheckoutEnabled: false,
      }
      const { service, paystackService } = makeService({
        saleModel: { findById: jest.fn(() => query(sale)) },
        userModel: {
          findById: jest.fn((id) =>
            query(String(id) === String(userId) ? customer : merchant),
          ),
        },
      })

      await expect(
        service.payWithSavedCard(
          saleId.toString(),
          { cardId: cardId.toString() },
          userId.toString(),
        ),
      ).rejects.toThrow('Saved-card checkout is not available')
      expect(paystackService.chargeAuthorization).not.toHaveBeenCalled()
    })

    it('does not issue another charge when an attempt already owns the sale', async () => {
      const saleId = new Types.ObjectId()
      const userId = new Types.ObjectId()
      const merchantId = new Types.ObjectId()
      const cardId = new Types.ObjectId()
      const sale = {
        _id: saleId,
        merchantId,
        customerUserId: userId,
        status: 'PENDING',
        amount: 5000,
      }
      const customer = {
        _id: userId,
        savedCards: [
          {
            _id: cardId,
            authorizationCode: 'AUTH_TEST123',
            reusable: true,
          },
        ],
      }
      const merchant = {
        _id: merchantId,
        planTier: 'PRO',
        planStatus: 'verified',
        paystackSubaccountCode: 'ACCT_MERCHANT_1',
      }
      const { service, paystackService } = makeService({
        saleModel: {
          findById: jest.fn(() => query(sale)),
          findOneAndUpdate: jest.fn(() => query(null)),
        },
        userModel: {
          findById: jest.fn((id) =>
            query(String(id) === String(userId) ? customer : merchant),
          ),
        },
      })

      await expect(
        service.payWithSavedCard(
          saleId.toString(),
          { cardId: cardId.toString() },
          userId.toString(),
        ),
      ).rejects.toThrow('This payment is already being processed')
      expect(paystackService.chargeAuthorization).not.toHaveBeenCalled()
    })
  })
})
