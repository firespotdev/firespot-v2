import { QRKitsService } from './qr-kits.service'

jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
  customAlphabet: () => () => 'TESTSER1',
}))

describe('QRKitsService Paystack verification', () => {
  it('only exposes enabled bank accounts to customers', async () => {
    const merchant = {
      _id: 'merchant-id',
      businessName: 'Test Store',
      planTier: 'LITE',
      planStatus: 'verified',
      bankAccounts: [
        {
          bankName: 'Visible Bank',
          bankCode: '001',
          accountNumber: '0123456789',
          accountName: 'Test Store',
          isPrimary: true,
          isEnabled: true,
        },
        {
          bankName: 'Hidden Bank',
          bankCode: '002',
          accountNumber: '9876543210',
          accountName: 'Test Store',
          isPrimary: false,
          isEnabled: false,
        },
        {
          bankName: 'Existing Bank',
          bankCode: '003',
          accountNumber: '1111111111',
          accountName: 'Test Store',
          isPrimary: false,
        },
      ],
    }
    const qrKit = {
      activationStatus: 'activated',
      merchantId: merchant,
    }
    const populate = jest.fn().mockResolvedValue(qrKit)
    const qrKitModel = {
      findOne: jest.fn().mockReturnValue({ populate }),
    }
    const service = new QRKitsService(
      qrKitModel as any,
      {} as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue('test-secret') } as any,
      {} as any,
      {} as any,
      {} as any,
      { ensureForUserId: jest.fn() } as unknown as ConstructorParameters<typeof QRKitsService>[8],
    )

    const publicResult = await service.getQRKitBySerial('fs-test123')
    expect(publicResult.bankAccounts).toHaveLength(2)
    expect(publicResult.bankAccounts.every((account) => account.accountNumber === '')).toBe(true)
    expect(new Set(publicResult.bankAccounts.map((account) => account.id)).size).toBe(2)
    expect(publicResult.bankAccounts[0].id).not.toContain('0123456789')
    const result = await service.getQRKitBySerial('fs-test123', undefined, undefined, undefined, true)

    expect(result.bankAccounts).toEqual([
      expect.objectContaining({ accountNumber: '0123456789' }),
      expect.objectContaining({ accountNumber: '1111111111' }),
    ])
  })

  it('hides every bank account when manual bank transfer is disabled', async () => {
    const merchant = {
      _id: 'merchant-id',
      businessName: 'Test Store',
      bankTransferEnabled: false,
      bankAccounts: [
        {
          bankName: 'Hidden Bank',
          bankCode: '001',
          accountNumber: '0123456789',
          accountName: 'Test Store',
          isPrimary: true,
          isEnabled: true,
        },
      ],
    }
    const populate = jest.fn().mockResolvedValue({
      activationStatus: 'activated',
      merchantId: merchant,
    })
    const qrKitModel = {
      findOne: jest.fn().mockReturnValue({ populate }),
    }
    const service = new QRKitsService(
      qrKitModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { ensureForUserId: jest.fn() } as unknown as ConstructorParameters<typeof QRKitsService>[8],
    )

    const result = await service.getQRKitBySerial('fs-test123')

    expect(result.bankAccounts).toEqual([])
  })

  it('does not activate a kit from a wrong-value success webhook', async () => {
    const qrKit = {
      activationStatus: 'pending',
      paymentStatus: 'pending',
      activationAmount: 100000,
      save: jest.fn().mockResolvedValue(undefined),
    }
    const qrKitModel = { findOne: jest.fn().mockResolvedValue(qrKit) }
    const service = new QRKitsService(
      qrKitModel as any,
      {} as any,
      {} as any,
      {} as any,
      {
        get: jest.fn((key: string) =>
          key === 'QR_KIT_ACTIVATION_AMOUNT' ? '1000' : undefined,
        ),
      } as any,
      {} as any,
      {} as any,
      {} as any,
      { ensureForUserId: jest.fn() } as unknown as ConstructorParameters<typeof QRKitsService>[8],
    )

    await expect(
      service.completeActivationByWebhook('qrkit_FS-GSTY673A_ABC123', {
        status: 'success',
        reference: 'qrkit_FS-GSTY673A_ABC123',
        amount: 99999,
        currency: 'NGN',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ reason: 'amount_mismatch' }),
    })
    expect(qrKit.activationStatus).toBe('pending')
    expect(qrKit.paymentStatus).toBe('failed')
  })
})

describe('Paid digital kit creation', () => {
  const merchantId = '507f1f77bcf86cd799439011'
  const orderId = '507f1f77bcf86cd799439012'
  const setup = () => {
    let savedKit: Record<string, unknown> | null = null
    const qrKitModel = {
      findById: jest.fn(() => Promise.resolve(savedKit)),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue(undefined),
      findOneAndUpdate: jest.fn((_filter: unknown, update: { $setOnInsert: Record<string, unknown> }) => {
        savedKit ??= { _id: (_filter as { _id: unknown })._id, ...update.$setOnInsert }
        return Promise.resolve(savedKit)
      }),
    }
    const users = { findById: jest.fn().mockResolvedValue({ _id: merchantId, merchantSlug: 'SHOP' }) }
    const qrCode = {
      generateQRCodeSVG: jest.fn().mockResolvedValue('<svg/>'),
      uploadQRCodeSVG: jest.fn().mockResolvedValue({ url: 'https://example.test/kit.svg', publicId: 'kit' }),
    }
    const service = new QRKitsService(
      qrKitModel as unknown as ConstructorParameters<typeof QRKitsService>[0],
      users as unknown as ConstructorParameters<typeof QRKitsService>[1],
      {} as unknown as ConstructorParameters<typeof QRKitsService>[2],
      {} as unknown as ConstructorParameters<typeof QRKitsService>[3],
      {} as unknown as ConstructorParameters<typeof QRKitsService>[4],
      {} as unknown as ConstructorParameters<typeof QRKitsService>[5],
      {} as unknown as ConstructorParameters<typeof QRKitsService>[6],
      qrCode as unknown as ConstructorParameters<typeof QRKitsService>[7],
      { ensureForUserId: jest.fn() } as unknown as ConstructorParameters<typeof QRKitsService>[8],
    )
    return { service, qrKitModel, qrCode }
  }

  it('creates one digital kit for simultaneous and repeated fulfilment of a paid order', async () => {
    const { service, qrKitModel } = setup()
    const [first, second] = await Promise.all([
      service.createPaidDigitalKit(merchantId, orderId), service.createPaidDigitalKit(merchantId, orderId),
    ])
    const repeated = await service.createPaidDigitalKit(merchantId, orderId)
    expect(first._id).toBe(second._id)
    expect(repeated._id).toBe(first._id)
    expect(qrKitModel.findOneAndUpdate.mock.calls[0][1].$setOnInsert).toMatchObject({
      paymentStatus: 'successful', isDigital: true, source: 'online-order',
    })
  })

  it.each(['owned', 'reserved'])('does not add a first-plan digital kit when a kit is already %s', async (kind) => {
    const { service, qrKitModel } = setup()
    const existing = { _id: 'existing-kit', isDigital: false, [kind === 'owned' ? 'merchantId' : 'reservedForMerchantId']: merchantId }
    qrKitModel.findOne.mockResolvedValue(existing)
    await expect(service.ensureFirstPlanDigitalKit(merchantId)).resolves.toBe(existing)
    expect(qrKitModel.findOne).toHaveBeenCalledWith({ $or: [{ merchantId }, { reservedForMerchantId: merchantId }] })
    expect(qrKitModel.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('uses one stable first-plan kit identity across simultaneous grants and retries', async () => {
    const { service, qrKitModel } = setup()
    const [first, second] = await Promise.all([
      service.ensureFirstPlanDigitalKit(merchantId), service.ensureFirstPlanDigitalKit(merchantId),
    ])
    await service.ensureFirstPlanDigitalKit(merchantId)
    expect(first._id).toBe(second._id)
    expect(first._id.toString()).toBe(merchantId)
    for (const [filter] of qrKitModel.findOneAndUpdate.mock.calls) {
      expect(filter).toEqual({ _id: expect.anything() })
      expect(String((filter as { _id: unknown })._id)).toBe(merchantId)
    }
  })

  it('repairs an included kit after SVG provisioning fails instead of issuing a second kit', async () => {
    const { service, qrKitModel, qrCode } = setup()
    qrCode.generateQRCodeSVG.mockRejectedValueOnce(new Error('Temporary QR generation failure'))
    await expect(service.ensureFirstPlanDigitalKit(merchantId)).rejects.toThrow('Temporary QR generation failure')
    const existing = await qrKitModel.findById()
    qrKitModel.findOne.mockResolvedValue(existing)
    const repaired = await service.ensureFirstPlanDigitalKit(merchantId)
    expect(repaired._id.toString()).toBe(merchantId)
    expect(repaired.qrCodeSvgUrl).toBe('https://example.test/kit.svg')
    expect(qrKitModel.findOneAndUpdate).toHaveBeenCalledTimes(1)
  })

  it('rejects free generation and recovery without an existing paid digital kit', async () => {
    const { service, qrKitModel } = setup()
    expect(() => service.generateDigitalKit()).toThrow('Purchase a digital QR kit')
    await expect(service.claimDigitalKit(merchantId)).rejects.toThrow('Purchase a digital QR kit')
    expect(qrKitModel.findOneAndUpdate).not.toHaveBeenCalled()
  })
})

describe('Physical kit activation includes LITE', () => {
  it.each([false, true])('preserves activation charges and prepaid exemptions (prepaid=%s)', async (prepaid) => {
    const user = {
      _id: '507f1f77bcf86cd799439011', businessName: 'Test Shop', merchantSlug: 'TEST',
      bankAccounts: [{}], phoneNumber: '8031234567', availableKitEntitlements: prepaid ? 1 : 0,
      save: jest.fn().mockResolvedValue(undefined),
    }
    const kit = { _id: '507f1f77bcf86cd799439012', serialNumber: 'TEST', activationStatus: 'pending',
      merchantId: null, agentId: 'agent-id', save: jest.fn().mockResolvedValue(undefined) }
    const users = { findById: jest.fn().mockResolvedValue(user), findOne: jest.fn().mockResolvedValue(user), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) }
    const paystack = { initializeTransaction: jest.fn().mockResolvedValue({ authorizationUrl: 'https://checkout.paystack.com/test', reference: 'qrkit-test' }) }
    const service = new QRKitsService(
      { findOne: jest.fn().mockResolvedValue(kit) } as unknown as ConstructorParameters<typeof QRKitsService>[0],
      users as unknown as ConstructorParameters<typeof QRKitsService>[1],
      { findById: jest.fn().mockResolvedValue({ subaccountCode: 'ACCT-agent' }) } as unknown as ConstructorParameters<typeof QRKitsService>[2],
      paystack as unknown as ConstructorParameters<typeof QRKitsService>[3],
      { get: (key: string) => key === 'QR_KIT_ACTIVATION_AMOUNT' ? '1000' : undefined } as unknown as ConstructorParameters<typeof QRKitsService>[4],
      {} as ConstructorParameters<typeof QRKitsService>[5],
      { sendSms: jest.fn() } as unknown as ConstructorParameters<typeof QRKitsService>[6],
      {} as ConstructorParameters<typeof QRKitsService>[7],
      { ensureForUserId: jest.fn() } as unknown as ConstructorParameters<typeof QRKitsService>[8],
    )
    // Agent notification is unrelated to the paid entitlement assertion.
    await service.initiateActivation('TEST', user._id)
    if (prepaid) {
      expect(paystack.initializeTransaction).not.toHaveBeenCalled()
      expect(kit.activationStatus).toBe('activated')
      expect(users.updateOne).toHaveBeenCalledWith(expect.any(Object), { $set: { planTier: 'LITE', planStatus: 'paid' } })
    } else {
      expect(paystack.initializeTransaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 100000, subaccount: 'ACCT-agent', transactionCharge: 50000 }))
      expect(users.updateOne).not.toHaveBeenCalled()
    }
  })
})

describe('Verified physical activation', () => {
  it('grants LITE only after the activation payment is verified', async () => {
    const merchantId = '507f1f77bcf86cd799439011'
    const kit = { merchantId, serialNumber: 'TEST', activationStatus: 'pending', paystackExpectedAmountKobo: 100000, save: jest.fn() }
    const users = {
      findById: jest.fn().mockResolvedValue({ _id: merchantId, merchantSlug: 'SHOP' }),
      findOne: jest.fn().mockResolvedValue({ kyc: {} }), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    }
    const paystack = { verifyTransaction: jest.fn().mockResolvedValue({ status: 'success', reference: 'qrkit-paid', amount: 100000, currency: 'NGN', paidAt: '2026-10-27T12:00:00.000Z' }) }
    const service = new QRKitsService(
      { findOne: jest.fn().mockResolvedValue(kit) } as unknown as ConstructorParameters<typeof QRKitsService>[0],
      users as unknown as ConstructorParameters<typeof QRKitsService>[1],
      {} as ConstructorParameters<typeof QRKitsService>[2],
      paystack as unknown as ConstructorParameters<typeof QRKitsService>[3],
      {} as ConstructorParameters<typeof QRKitsService>[4],
      {} as ConstructorParameters<typeof QRKitsService>[5],
      {} as ConstructorParameters<typeof QRKitsService>[6],
      {} as ConstructorParameters<typeof QRKitsService>[7],
      { ensureForUserId: jest.fn() } as unknown as ConstructorParameters<typeof QRKitsService>[8],
    )
    await service.completeActivationByReference('qrkit-paid')
    expect(kit.activationStatus).toBe('activated')
    expect(users.updateOne).toHaveBeenCalledWith(expect.any(Object), { $set: { planTier: 'LITE', planStatus: 'paid' } })
  })
})
