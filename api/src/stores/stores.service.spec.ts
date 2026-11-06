import {
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { StoresService } from './stores.service'

const query = (val: unknown) => ({
  exec: jest.fn().mockResolvedValue(val),
  sort: jest.fn().mockReturnThis(),
})

describe('StoresService', () => {
  let service: StoresService
  let storeModel: any
  let userModel: any
  let paystackService: any
  let configService: any

  beforeEach(() => {
    storeModel = {
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      find: jest.fn().mockReturnValue(query([])),
      findOne: jest.fn().mockReturnValue(query(null)),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    }
    // Model constructor mock
    const StoreMock: any = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this)
      }),
    }))
    Object.assign(StoreMock, storeModel)
    storeModel = StoreMock

    userModel = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    }

    paystackService = {
      createSubscription: jest.fn().mockResolvedValue({
        subscriptionCode: 'SUB_store2',
        emailToken: 'TOK_store2',
      }),
      disableSubscription: jest.fn().mockResolvedValue({ success: true }),
      fetchSubscription: jest.fn(),
    }

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'PAYSTACK_PLAN_CODE_PROMAX') return 'PLN_promax'
        return null
      }),
    }

    service = new StoresService(
      storeModel,
      userModel,
      paystackService,
      configService,
    )
  })

  describe('create', () => {
    const merchantId = '507f1f77bcf86cd799439011'
    const storeId = '507f1f77bcf86cd799439022'

    it('creates primary store without extra subscription if active stores is 0', async () => {
      const user = {
        _id: merchantId,
        role: 'merchant',
        planTier: 'LITE',
        subscriptions: [],
        save: jest.fn(),
      }
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      })
      storeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      })

      const store = await service.create(merchantId, {
        name: 'Main Store',
        idempotencyKey: '83e250c4-24db-4b2d-a627-7cf14e82a16c',
      })

      expect(store.name).toBe('Main Store')
      expect(store.isActive).toBe(true)
      expect(paystackService.createSubscription).not.toHaveBeenCalled()
      expect(store.isPrimary).toBe(true)
    })

    it('rejects store management for a customer account', async () => {
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ role: 'customer' }),
      })

      await expect(
        service.create(merchantId, {
          name: 'Not a merchant store',
          idempotencyKey: '5c8fa8f4-929e-4435-a48b-f0519901d65a',
        }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('rejects adding an additional store if merchant is not on PROMAX', async () => {
      const user = {
        _id: merchantId,
        role: 'merchant',
        planTier: 'PRO',
        subscriptions: [],
      }
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      })
      storeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      })

      await expect(
        service.create(merchantId, {
          name: 'Branch 2',
          idempotencyKey: '9bda40de-b140-4d3f-bb41-97539854bb09',
        }),
      ).rejects.toThrow(ForbiddenException)
      expect(paystackService.createSubscription).not.toHaveBeenCalled()
    })

    it('rejects adding an additional store if merchant has no saved payment authorization', async () => {
      const user = {
        _id: merchantId,
        role: 'merchant',
        planTier: 'PROMAX',
        paystackCustomerCode: 'CUS_1',
        // no paystackAuthorizationCode
      }
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      })
      storeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      })

      await expect(
        service.create(merchantId, {
          name: 'Branch 2',
          idempotencyKey: '2521aca3-5876-4f0f-9d08-e9198b692c88',
        }),
      ).rejects.toThrow(BadRequestException)
      expect(paystackService.createSubscription).not.toHaveBeenCalled()
    })

    it('creates subscription and saves subscriptionCode + emailToken on store when adding second store on PROMAX', async () => {
      const user = {
        _id: merchantId,
        role: 'merchant',
        planTier: 'PROMAX',
        paystackCustomerCode: 'CUS_1',
        paystackAuthorizationCode: 'AUTH_1',
        subscriptions: [],
        subscriptionCodes: [],
        save: jest.fn().mockResolvedValue(undefined),
      }
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      })
      storeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      })

      const store = await service.create(merchantId, {
        name: 'Branch 2',
        idempotencyKey: 'ba96aa65-5402-4f50-8d11-16ae3568dd93',
      })

      expect(paystackService.createSubscription).toHaveBeenCalledWith({
        customer: 'CUS_1',
        plan: 'PLN_promax',
        authorization: 'AUTH_1',
      })
      expect(store.subscriptionCode).toBe('SUB_store2')
      expect(store.subscriptionEmailToken).toBe('TOK_store2')
      expect(user.save).toHaveBeenCalled()
      expect(user.subscriptions).toHaveLength(1)
      expect(user.subscriptions[0].code).toBe('SUB_store2')
      expect(user.subscriptions[0].kind).toBe('branch')
      expect(user.subscriptions[0].storeId).toBe(store._id)
    })

    it('cancels the Paystack subscription when activating the local store fails', async () => {
      const user = {
        _id: merchantId,
        role: 'merchant',
        planTier: 'PROMAX',
        paystackCustomerCode: 'CUS_1',
        paystackAuthorizationCode: 'AUTH_1',
        subscriptions: [],
        subscriptionCodes: [],
        save: jest.fn(),
      }
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      })
      storeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      })
      let saves = 0
      storeModel.mockImplementationOnce((dto: any) => ({
        ...dto,
        _id: storeId,
        save: jest.fn().mockImplementation(function (this: any) {
          saves += 1
          return saves === 1
            ? Promise.resolve(this)
            : Promise.reject(new Error('db down'))
        }),
      }))

      await expect(
        service.create(merchantId, {
          name: 'Branch 2',
          idempotencyKey: '6545ba9e-6171-413b-9e32-f29493cebf01',
        }),
      ).rejects.toThrow(ServiceUnavailableException)

      expect(paystackService.disableSubscription).toHaveBeenCalledWith({
        code: 'SUB_store2',
        token: 'TOK_store2',
      })
      expect(storeModel.updateOne).toHaveBeenCalledWith(
        { _id: storeId },
        expect.objectContaining({
          $set: expect.objectContaining({ billingStatus: 'cancelled' }),
        }),
      )
    })
  })

  describe('deactivate', () => {
    const merchantId = '507f1f77bcf86cd799439011'
    const storeId = '507f1f77bcf86cd799439022'

    it('disables subscription on Paystack when deactivating a funded store', async () => {
      const storeDoc = {
        _id: storeId,
        merchantId,
        isActive: true,
        subscriptionCode: 'SUB_store2',
        subscriptionEmailToken: 'TOK_store2',
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this)
        }),
      }
      storeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(storeDoc),
      })

      const deactivated = await service.deactivate(merchantId, storeId)

      expect(paystackService.disableSubscription).toHaveBeenCalledWith({
        code: 'SUB_store2',
        token: 'TOK_store2',
      })
      expect(deactivated.isActive).toBe(false)
      expect(deactivated.subscriptionCode).toBe('SUB_store2')
      expect(deactivated.subscriptionEmailToken).toBe('TOK_store2')
      expect(deactivated.billingStatus).toBe('cancelled')
    })

    it('keeps a store active and retains billing identifiers when cancellation fails', async () => {
      const storeDoc = {
        _id: storeId,
        merchantId,
        isPrimary: false,
        isActive: true,
        billingStatus: 'active',
        subscriptionCode: 'SUB_store2',
        subscriptionEmailToken: 'TOK_store2',
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this)
        }),
      }
      storeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(storeDoc),
      })
      paystackService.disableSubscription.mockRejectedValue(
        new Error('Paystack unavailable'),
      )

      await expect(service.deactivate(merchantId, storeId)).rejects.toThrow(
        ServiceUnavailableException,
      )

      expect(storeDoc.isActive).toBe(true)
      expect(storeDoc.billingStatus).toBe('active')
      expect(storeDoc.subscriptionCode).toBe('SUB_store2')
      expect(storeDoc.subscriptionEmailToken).toBe('TOK_store2')
      expect(userModel.updateOne).not.toHaveBeenCalled()
    })
  })
})
