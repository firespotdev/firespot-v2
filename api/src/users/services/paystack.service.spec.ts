import axios from 'axios'
import { PaystackService } from './paystack.service'
import crypto from 'crypto'

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

describe("PaystackService webhook signature", () => {
  const secret = "sk_test_example";
  const service = new PaystackService({ get: jest.fn(() => secret) } as any);
  const body = JSON.stringify({
    event: "charge.success",
    data: { reference: "COL-1" },
  });
  const sign = (payload: string) =>
    crypto.createHmac("sha512", secret).update(payload).digest("hex");

  it("accepts a signature computed over the raw body", () => {
    expect(service.verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a signature for a different body", () => {
    expect(service.verifyWebhookSignature(body, sign(`${body} `))).toBe(false);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["truncated", "abc123"],
  ])("rejects a %s signature without throwing", (_, signature) => {
    expect(service.verifyWebhookSignature(body, signature)).toBe(
      false,
    );
  });

  it("compares signatures in constant time", () => {
    const spy = jest.spyOn(crypto, "timingSafeEqual");
    service.verifyWebhookSignature(body, sign(body));
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
