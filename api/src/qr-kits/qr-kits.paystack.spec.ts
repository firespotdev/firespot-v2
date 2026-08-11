import { QRKitsService } from './qr-kits.service'

jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
  customAlphabet: () => () => 'TESTSER1',
}))

describe('QRKitsService Paystack verification', () => {
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
