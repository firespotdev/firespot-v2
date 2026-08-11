import { QROrdersService } from './qr-orders.service'

jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
  customAlphabet: () => () => 'TESTSER1',
}))

const makeService = () => {
  const orderModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  }
  const paystackService = { verifyTransaction: jest.fn() }
  const service = new QROrdersService(
    orderModel as any,
    {} as any,
    {} as any,
    paystackService as any,
    {} as any,
    {} as any,
    {} as any,
  )
  return { service, orderModel, paystackService }
}

describe('QROrdersService Paystack verification', () => {
  it('does not fulfil an order whose successful payment amount is wrong', async () => {
    const order = { paymentStatus: 'PENDING', totalAmount: 5000 }
    const { service, orderModel, paystackService } = makeService()
    orderModel.findOne.mockResolvedValue(order)
    orderModel.findOneAndUpdate.mockResolvedValue(order)
    paystackService.verifyTransaction.mockResolvedValue({
      status: 'success',
      reference: 'ORD-1',
      amount: 499999,
      currency: 'NGN',
    })
    const fulfil = jest
      .spyOn(service as any, 'fulfilOrder')
      .mockResolvedValue(undefined)

    await expect(service.verifyPayment('ORD-1')).rejects.toMatchObject({
      response: expect.objectContaining({ reason: 'amount_mismatch' }),
    })
    expect(fulfil).not.toHaveBeenCalled()
    expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
      { paystackReference: 'ORD-1' },
      { paymentStatus: 'FAILED' },
    )
  })

  it('fulfils after exact reference, amount, and currency validation', async () => {
    const order = { paymentStatus: 'PENDING', totalAmount: 5000 }
    const settledOrder = { ...order, paymentStatus: 'SUCCESSFUL' }
    const { service, orderModel, paystackService } = makeService()
    orderModel.findOne.mockResolvedValue(order)
    orderModel.findOneAndUpdate.mockResolvedValue(settledOrder)
    paystackService.verifyTransaction.mockResolvedValue({
      status: 'success',
      reference: 'ORD-1',
      amount: 500000,
      currency: 'NGN',
      paidAt: '2026-08-11T12:00:00.000Z',
    })
    const fulfil = jest
      .spyOn(service as any, 'fulfilOrder')
      .mockResolvedValue(undefined)

    await expect(service.verifyPayment('ORD-1')).resolves.toBe(settledOrder)
    expect(fulfil).toHaveBeenCalledWith(settledOrder)
  })
})
