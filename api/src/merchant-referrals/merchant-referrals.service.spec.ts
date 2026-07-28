import { BadRequestException } from '@nestjs/common'
import { Types } from 'mongoose'
import { MerchantReferralsService } from './merchant-referrals.service'

const query = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
})

describe('MerchantReferralsService', () => {
  const makeService = (overrides: Record<string, any> = {}) => {
    const userModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      ...overrides.userModel,
    }
    const agentModel = {
      findOne: jest.fn(),
      ...overrides.agentModel,
    }
    const saleModel = {
      aggregate: jest.fn(),
      ...overrides.saleModel,
    }
    const referralModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
      aggregate: jest.fn(),
      ...overrides.referralModel,
    }
    const ledgerModel = {
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
      ...overrides.ledgerModel,
    }
    const configService = {
      get: jest.fn((_key: string, fallback: unknown) => fallback),
      ...overrides.configService,
    }

    return {
      service: new MerchantReferralsService(
        userModel as any,
        agentModel as any,
        saleModel as any,
        referralModel as any,
        ledgerModel as any,
        configService as any,
      ),
      userModel,
      agentModel,
      saleModel,
      referralModel,
      ledgerModel,
    }
  }

  it('gives a valid agent code precedence over a merchant link', async () => {
    const agent = { _id: new Types.ObjectId(), status: 'active' }
    const { service, agentModel, userModel } = makeService({
      agentModel: {
        findOne: jest.fn().mockReturnValue(query(agent)),
      },
    })

    const result = await service.validateOnboardingAttribution({
      referralCode: 'agent123',
      merchantReferralCode: 'FSM-ABC234',
    })

    expect(result).toEqual({ source: 'agent', agent })
    expect(agentModel.findOne).toHaveBeenCalledWith({
      referralCode: 'AGENT123',
      status: 'active',
    })
    expect(userModel.findOne).not.toHaveBeenCalled()
  })

  it('generates merchant codes in FSM-XXXXXX format', async () => {
    const merchant = {
      _id: new Types.ObjectId(),
      role: 'merchant',
    }
    const findOneAndUpdate = jest.fn(
      (_filter: unknown, update: any) =>
        query({
          ...merchant,
          merchantReferralCode: update.$set.merchantReferralCode,
        }),
    )
    const { service } = makeService({
      userModel: {
        findById: jest.fn().mockReturnValue(query(merchant)),
        findOneAndUpdate,
      },
    })

    await expect(service.ensureMerchantCode(merchant._id)).resolves.toMatch(
      /^FSM-[A-Z2-9]{6}$/,
    )
  })

  it('rejects a merchant referrer without a verified active plan', async () => {
    const { service } = makeService({
      userModel: {
        findOne: jest.fn().mockReturnValue(
          query({
            _id: new Types.ObjectId(),
            role: 'merchant',
            planTier: 'PRO',
            planStatus: 'paid',
          }),
        ),
      },
    })

    await expect(
      service.validateOnboardingAttribution({
        merchantReferralCode: 'FSM-ABC234',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('creates one earned ledger row at NGN 50,000 confirmed collection volume', async () => {
    const referredMerchantId = new Types.ObjectId()
    const referrerMerchantId = new Types.ObjectId()
    const referralId = new Types.ObjectId()
    const ledgerId = new Types.ObjectId()
    const referral = {
      _id: referralId,
      referrerMerchantId,
      referredMerchantId,
      status: 'ATTRIBUTED',
      thresholdAmount: 50_000,
    }
    const ledger = {
      _id: ledgerId,
      earnedAt: new Date(),
      amount: 0,
    }
    const updateOne = jest.fn().mockReturnValue(query({ modifiedCount: 1 }))
    const { service, ledgerModel, referralModel } = makeService({
      saleModel: {
        aggregate: jest.fn().mockReturnValue(query([{ amount: 50_000 }])),
      },
      referralModel: {
        findOne: jest.fn().mockReturnValue(query(referral)),
        updateOne,
        findById: jest.fn().mockReturnValue(query(referral)),
      },
      userModel: {
        findById: jest.fn().mockReturnValue(
          query({
            _id: referrerMerchantId,
            role: 'merchant',
            planTier: 'LITE',
            planStatus: 'verified',
          }),
        ),
      },
      ledgerModel: {
        findOneAndUpdate: jest.fn().mockReturnValue(query(ledger)),
      },
    })

    await expect(
      service.evaluateReferredMerchant(referredMerchantId),
    ).resolves.toEqual({
      qualified: true,
      volume: 50_000,
      ledgered: true,
    })
    expect(ledgerModel.findOneAndUpdate).toHaveBeenCalledTimes(1)
    expect(referralModel.updateOne).toHaveBeenLastCalledWith(
      { _id: referralId },
      {
        $set: {
          status: 'LEDGERED',
          rewardEligibleAt: ledger.earnedAt,
          ledgerEntryId: ledgerId,
        },
      },
    )
  })
})
