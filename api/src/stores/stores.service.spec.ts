import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common'
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
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      find: jest.fn().mockReturnValue(query([])),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
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
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    }

    paystackService = {
      createSubscription: jest.fn().mockResolvedValue({
        subscriptionCode: 'SUB_store2',
        emailToken: 'TOK_store2',
      }),
      disableSubscription: jest.fn().mockResolvedValue({ success: true }),
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
        planTier: 'LITE',
        subscriptions: [],
        save: jest.fn(),
      }
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) })
      storeModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) })

      const store = await service.create(merchantId, { name: 'Main Store' })

      expect(store.name).toBe('Main Store')
      expect(store.isActive).toBe(true)
      expect(paystackService.createSubscription).not.toHaveBeenCalled()
    })

    it('rejects adding an additional store if merchant is not on PROMAX', async () => {
      const user = {
        _id: merchantId,
        planTier: 'PRO',
        subscriptions: [],
      }
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) })
      storeModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) })

      await expect(
        service.create(merchantId, { name: 'Branch 2' }),
      ).rejects.toThrow(ForbiddenException)
      expect(paystackService.createSubscription).not.toHaveBeenCalled()
    })

    it('rejects adding an additional store if merchant has no saved payment authorization', async () => {
      const user = {
        _id: merchantId,
        planTier: 'PROMAX',
        paystackCustomerCode: 'CUS_1',
        // no paystackAuthorizationCode
      }
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) })
      storeModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) })

      await expect(
        service.create(merchantId, { name: 'Branch 2' }),
      ).rejects.toThrow(BadRequestException)
      expect(paystackService.createSubscription).not.toHaveBeenCalled()
    })

    it('creates subscription and saves subscriptionCode + emailToken on store when adding second store on PROMAX', async () => {
      const user = {
        _id: merchantId,
        planTier: 'PROMAX',
        paystackCustomerCode: 'CUS_1',
        paystackAuthorizationCode: 'AUTH_1',
        subscriptions: [],
        subscriptionCodes: [],
        save: jest.fn().mockResolvedValue(undefined),
      }
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) })
      storeModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) })

      const store = await service.create(merchantId, { name: 'Branch 2' })

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
      storeModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(storeDoc) })

      const deactivated = await service.deactivate(merchantId, storeId)

      expect(paystackService.disableSubscription).toHaveBeenCalledWith({
        code: 'SUB_store2',
        token: 'TOK_store2',
      })
      expect(deactivated.isActive).toBe(false)
      expect(deactivated.subscriptionCode).toBeUndefined()
      expect(deactivated.subscriptionEmailToken).toBeUndefined()
    })
  })
})
