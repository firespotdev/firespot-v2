import axios from 'axios'
import { PaystackService } from './paystack.service'

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    isAxiosError: jest.fn(() => false),
  },
}))

describe('PaystackService transaction verification', () => {
  it('returns Paystack actual fees, currency, and environment domain', async () => {
    const service = new PaystackService({
      get: jest.fn(() => 'sk_test_example'),
    } as any)
    ;(axios.get as jest.Mock).mockResolvedValue({
      data: {
        status: true,
        data: {
          id: 1,
          status: 'success',
          reference: 'COL-1',
          amount: 500000,
          paid_at: '2026-08-11T12:00:00.000Z',
          channel: 'card',
          currency: 'NGN',
          fees: 12345,
          domain: 'test',
        },
      },
    })

    await expect(service.verifyTransaction('COL-1')).resolves.toMatchObject({
      status: 'success',
      reference: 'COL-1',
      amount: 500000,
      currency: 'NGN',
      fees: 12345,
      domain: 'test',
    })
  })
})
