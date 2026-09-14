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
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    )

    const result = await service.getQRKitBySerial('fs-test123')

    expect(result.bankAccounts).toEqual([
      expect.objectContaining({ accountNumber: '0123456789' }),
      expect.objectContaining({ accountNumber: '1111111111' }),
    ])
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
