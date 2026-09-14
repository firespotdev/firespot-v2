import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { Model, Types } from 'mongoose'
import { Store, StoreDocument } from '../schemas/store.schema'
import { User, UserDocument } from '../schemas/user.schema'
import { PaystackService } from '../users/services/paystack.service'
import { getEffectiveTier } from '../merchant-plans/constants/plans'

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name)

  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private paystackService: PaystackService,
    private configService: ConfigService,
  ) {}

  async create(
    merchantId: string,
    dto: { name: string; address?: string; location?: string },
  ): Promise<Store> {
    const user = await this.userModel.findById(merchantId).exec()
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const existingCount = await this.countActive(merchantId)
    let subscriptionCode: string | undefined
    let subscriptionEmailToken: string | undefined

    // Adding additional stores beyond the primary store requires PRO MAX and
    // creates an independent Paystack subscription for each extra store.
    if (existingCount >= 1) {
      const effectiveTier = getEffectiveTier(user)
      if (effectiveTier !== 'PROMAX') {
        throw new ForbiddenException(
          'Multiple stores require an active Firespot Business Pro Max plan.',
        )
      }

      if (!user.paystackCustomerCode || !user.paystackAuthorizationCode) {
        throw new BadRequestException(
          'A saved payment method is required to activate an additional store.',
        )
      }

      const planCode = this.configService.get<string>('PAYSTACK_PLAN_CODE_PROMAX')
      if (!planCode) {
        this.logger.error('Missing PAYSTACK_PLAN_CODE_PROMAX for store subscription')
        throw new ServiceUnavailableException(
          'Store billing is temporarily unavailable.',
        )
      }

      try {
        const sub = await this.paystackService.createSubscription({
          customer: user.paystackCustomerCode,
          plan: planCode,
          authorization: user.paystackAuthorizationCode,
        })
        subscriptionCode = sub.subscriptionCode
        subscriptionEmailToken = sub.emailToken

        if (!user.subscriptions) user.subscriptions = []
        user.subscriptions.push({
          code: sub.subscriptionCode,
          emailToken: sub.emailToken,
          planCode,
          interval: 'monthly',
          status: 'active',
          createdAt: new Date(),
        })
        if (!user.subscriptionCodes?.includes(sub.subscriptionCode)) {
          user.subscriptionCodes = [
            ...(user.subscriptionCodes || []),
            sub.subscriptionCode,
          ]
        }
        await user.save()
      } catch (error: any) {
        this.logger.error(
          `Failed to create subscription for additional store: ${error?.message || error}`,
        )
        throw new BadRequestException(
          error?.response?.data?.message ||
            error?.message ||
            'Could not activate subscription for additional store. Please check your payment method.',
        )
      }
    } else {
      // First store: if the merchant is already on PRO MAX, link any active primary subscription
      const activePromaxSub = user.subscriptions?.find(
        (s) => s.status === 'active' && s.code,
      )
      if (activePromaxSub) {
        subscriptionCode = activePromaxSub.code
        subscriptionEmailToken = activePromaxSub.emailToken
      }
    }

    const store = new this.storeModel({
      merchantId: new Types.ObjectId(merchantId),
      name: dto.name,
      address: dto.address,
      location: dto.location,
      isActive: true,
      subscriptionCode,
      subscriptionEmailToken,
    })
    return store.save()
  }

  async findAll(merchantId: string): Promise<Store[]> {
    return this.storeModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: 1 })
      .exec()
  }

  async findOne(merchantId: string, id: string): Promise<StoreDocument> {
    const store = await this.storeModel
      .findOne({
        _id: new Types.ObjectId(id),
        merchantId: new Types.ObjectId(merchantId),
      })
      .exec()
    if (!store) {
      throw new NotFoundException('Store not found')
    }
    return store
  }

  async update(
    merchantId: string,
    id: string,
    dto: { name?: string; address?: string; location?: string },
  ): Promise<Store> {
    const store = await this.findOne(merchantId, id)
    if (dto.name !== undefined) store.name = dto.name
    if (dto.address !== undefined) store.address = dto.address
    if (dto.location !== undefined) store.location = dto.location
    return store.save()
  }

  /**
   * Deactivates a store and cancels its paired Paystack subscription if present.
   */
  async deactivate(merchantId: string, id: string): Promise<Store> {
    const store = await this.findOne(merchantId, id)
    if (store.subscriptionCode) {
      let token = store.subscriptionEmailToken
      if (!token) {
        const user = await this.userModel.findById(merchantId).exec()
        const sub = user?.subscriptions?.find(
          (s) => s.code === store.subscriptionCode,
        )
        token = sub?.emailToken
      }

      if (token) {
        try {
          await this.paystackService.disableSubscription({
            code: store.subscriptionCode,
            token,
          })
        } catch (error) {
          this.logger.error(
            `Failed to disable subscription ${store.subscriptionCode} for store ${store._id}: ${error}`,
          )
        }
      } else {
        this.logger.warn(
          `Cannot disable subscription ${store.subscriptionCode} for store ${store._id}: no email token`,
        )
      }

      await this.userModel.updateOne(
        {
          _id: new Types.ObjectId(merchantId),
          'subscriptions.code': store.subscriptionCode,
        },
        { $set: { 'subscriptions.$.status': 'cancelled' } },
      )
      store.subscriptionCode = undefined
      store.subscriptionEmailToken = undefined
    }

    store.isActive = false
    return store.save()
  }

  async countActive(merchantId: string): Promise<number> {
    return this.storeModel
      .countDocuments({
        merchantId: new Types.ObjectId(merchantId),
        isActive: true,
      })
      .exec()
  }

  async findBySubscriptionCode(
    subscriptionCode: string,
  ): Promise<StoreDocument | null> {
    return this.storeModel.findOne({ subscriptionCode }).exec()
  }

  async hasActiveStoreWithSubscription(
    merchantId: string,
    subscriptionCode: string,
  ): Promise<boolean> {
    const count = await this.storeModel.countDocuments({
      merchantId: new Types.ObjectId(merchantId),
      subscriptionCode,
      isActive: true,
    })
    return count > 0
  }

  async attachSubscriptionToPrimaryStore(
    merchantId: string,
    subscriptionCode: string,
    emailToken?: string,
  ): Promise<void> {
    await this.storeModel.updateOne(
      {
        merchantId: new Types.ObjectId(merchantId),
        isActive: true,
        $or: [
          { subscriptionCode: { $exists: false } },
          { subscriptionCode: null },
          { subscriptionCode: '' },
        ],
      },
      {
        $set: {
          subscriptionCode,
          subscriptionEmailToken: emailToken,
        },
      },
    )
  }

  async deactivateStoreBySubscription(
    merchantId: string,
    subscriptionCode: string,
  ): Promise<void> {
    const store = await this.storeModel.findOne({
      merchantId: new Types.ObjectId(merchantId),
      subscriptionCode,
      isActive: true,
    })
    if (store) {
      store.isActive = false
      await store.save()
    }
  }
}
