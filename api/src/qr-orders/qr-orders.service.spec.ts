import { validate } from 'class-validator'
import { CreateQROrderDto } from './dto/create-qr-order.dto'
import { QROrder, QROrderSchema } from '../schemas/qr-order.schema'
import { model } from 'mongoose'
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
    { ensureForUserId: jest.fn() } as unknown as ConstructorParameters<typeof QROrdersService>[7],
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

describe('Paid physical and digital QR orders', () => {
  const merchantId = '507f1f77bcf86cd799439011'
  const orderId = '507f1f77bcf86cd799439012'
  const setup = (price = '2500') => {
    const save = jest.fn().mockResolvedValue(undefined)
    const orderModel = Object.assign(jest.fn((data: Record<string, unknown>) => ({
      ...data, _id: orderId, save,
    })), { findOne: jest.fn(), findOneAndUpdate: jest.fn() })
    const userModel = {
      findById: jest.fn(() => ({ select: jest.fn().mockResolvedValue({
        fullPhoneNumber: '+2348031234567', businessName: 'Test Shop', bankAccounts: [{}],
      }) })),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn(),
    }
    const paystack = {
      initializeTransaction: jest.fn().mockResolvedValue({ authorizationUrl: 'https://checkout.paystack.com/test', reference: 'ORD-test' }),
      verifyTransaction: jest.fn(),
    }
    const kits = { createPaidDigitalKit: jest.fn().mockResolvedValue({ _id: orderId }) }
    const service = new QROrdersService(
      orderModel as unknown as ConstructorParameters<typeof QROrdersService>[0],
      userModel as unknown as ConstructorParameters<typeof QROrdersService>[1],
      {} as unknown as ConstructorParameters<typeof QROrdersService>[2],
      paystack as unknown as ConstructorParameters<typeof QROrdersService>[3],
      { get: (key: string) => ({ QR_KIT_PRICE: price, QR_KIT_DELIVERY_FEE: '2000' }[key]) } as unknown as ConstructorParameters<typeof QROrdersService>[4],
      kits as unknown as ConstructorParameters<typeof QROrdersService>[5],
      {} as unknown as ConstructorParameters<typeof QROrdersService>[6],
      { ensureForUserId: jest.fn() } as unknown as ConstructorParameters<typeof QROrdersService>[7],
    )
    return { service, orderModel, userModel, paystack, kits, save }
  }

  it.each([
    ['digital', 250000], ['physical', 450000],
  ] as const)('charges the configured %s price and only physical delivery', async (kitType, amount) => {
    const { service, paystack } = setup()
    await service.createOrder(merchantId, { kitType, quantity: 1, phoneNumber: '08031234567', state: 'Lagos', lga: 'Ikeja', deliveryAddress: '1 Test St' })
    expect(paystack.initializeTransaction).toHaveBeenCalledWith(expect.objectContaining({
      amount, callbackUrl: `http://localhost:3000/order-status?kitType=${kitType}`,
    }))
  })

  it.each(['LITE', 'PRO', 'PROMAX'])('lets an existing %s merchant buy a kit at the configured unit price', async (planTier) => {
    const { service, userModel, paystack } = setup()
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({
      fullPhoneNumber: '+2348031234567', businessName: 'Test Shop', bankAccounts: [{}],
      planTier, planStatus: 'verified',
    }) })
    await service.createOrder(merchantId, { kitType: 'digital', quantity: 1 })
    expect(paystack.initializeTransaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 250000 }))
    expect(userModel.updateOne).not.toHaveBeenCalled()
  })

  it.each(['0', '-1', 'invalid'])('rejects unavailable pricing %s without free fulfilment', async (price) => {
    const { service, paystack, kits } = setup(price)
    await expect(service.createOrder(merchantId, { kitType: 'digital', quantity: 1 })).rejects.toThrow('pricing is unavailable')
    expect(paystack.initializeTransaction).not.toHaveBeenCalled()
    expect(kits.createPaidDigitalKit).not.toHaveBeenCalled()
  })

  it('rejects multiple digital kits in one order', async () => {
    const { service } = setup()
    await expect(service.createOrder(merchantId, { kitType: 'digital', quantity: 2 })).rejects.toThrow('one new QR kit')
  })

  it('fulfils a verified digital payment and repairs repeated callbacks using the same order', async () => {
    const { service, orderModel, paystack, kits } = setup()
    const order = {
      _id: orderId, merchantId, kitType: 'digital', totalAmount: 2500,
      liteGranted: false, paymentStatus: 'PENDING', save: jest.fn().mockResolvedValue(undefined),
    }
    orderModel.findOne.mockResolvedValue(order)
    orderModel.findOneAndUpdate.mockImplementation(() => {
      order.paymentStatus = 'SUCCESSFUL'
      return Promise.resolve(order)
    })
    paystack.verifyTransaction.mockResolvedValue({ status: 'success', reference: 'ORD-test', currency: 'NGN', amount: 250000 })
    await service.verifyPayment('ORD-test')
    await service.verifyPayment('ORD-test')
    expect(paystack.verifyTransaction).toHaveBeenCalledTimes(1)
    expect(kits.createPaidDigitalKit.mock.calls).toEqual([[merchantId, orderId], [merchantId, orderId]])
    expect(order).toMatchObject({ orderStatus: 'COMPLETED', assignedKitIds: [orderId], liteGranted: false })
  })

  it('persists a new LITE grant for the success screen and preserves it on repeated verification', async () => {
    const { service, orderModel, paystack, userModel } = setup()
    const order = {
      _id: orderId, merchantId, kitType: 'digital', totalAmount: 2500,
      liteGranted: false, paymentStatus: 'PENDING', save: jest.fn().mockResolvedValue(undefined),
    }
    userModel.findOne.mockResolvedValueOnce({ kyc: {} }).mockResolvedValue(null)
    userModel.updateOne.mockResolvedValue({ modifiedCount: 1 })
    orderModel.findOne.mockResolvedValue(order)
    orderModel.findOneAndUpdate.mockImplementation(() => {
      order.paymentStatus = 'SUCCESSFUL'
      return Promise.resolve(order)
    })
    paystack.verifyTransaction.mockResolvedValue({ status: 'success', reference: 'ORD-test', currency: 'NGN', amount: 250000 })
    await expect(service.verifyPayment('ORD-test')).resolves.toMatchObject({ liteGranted: true })
    await expect(service.verifyPayment('ORD-test')).resolves.toMatchObject({ liteGranted: true })
    expect(userModel.updateOne).toHaveBeenCalledTimes(1)
  })

  it.each(['failed', 'abandoned'])('does not grant a kit or LITE after %s payment', async (status) => {
    const { service, orderModel, paystack, kits, userModel } = setup()
    orderModel.findOne.mockResolvedValue({ totalAmount: 2500, paymentStatus: 'PENDING', kitType: 'digital' })
    paystack.verifyTransaction.mockResolvedValue({ status, reference: 'ORD-test', amount: 250000, currency: 'NGN' })
    await expect(service.verifyPayment('ORD-test')).rejects.toThrow()
    expect(kits.createPaidDigitalKit).not.toHaveBeenCalled()
    expect(userModel.updateOne).not.toHaveBeenCalled()
  })
})


describe('QR order delivery validation', () => {
  it('requires delivery fields for physical orders but not digital orders', async () => {
    const physical = Object.assign(new CreateQROrderDto(), { quantity: 1 })
    expect((await validate(physical)).map(error => error.property).sort()).toEqual(['deliveryAddress', 'lga', 'phoneNumber', 'state'])
    expect(await validate(Object.assign(new CreateQROrderDto(), { quantity: 1, kitType: 'digital' }))).toHaveLength(0)
  })

  it('also enforces physical delivery requirements in the storage schema', async () => {
    const Order = model<QROrder>('DeliveryValidationOrder', QROrderSchema)
    const fields = { merchantId: '507f1f77bcf86cd799439011', quantity: 1, subtotal: 2500, totalAmount: 2500 }
    const physical = await new Order(fields).validate().catch((error: unknown) => error)
    for (const field of ['deliveryAddress', 'lga', 'phoneNumber', 'state']) {
      expect(physical).toHaveProperty(`errors.${field}`)
    }
    await expect(new Order({ ...fields, kitType: 'digital' }).validate()).resolves.toBeUndefined()
  })
})
