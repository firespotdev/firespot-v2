import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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
    dto: {
      name: string
      address?: string
      location?: string
      idempotencyKey: string
    },
  ): Promise<Store> {
    const user = await this.userModel.findById(merchantId).exec()
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (user.role !== 'merchant') {
      throw new ForbiddenException('Only merchants can manage stores.')
    }

    const merchantObjectId = new Types.ObjectId(merchantId)
    const existingRequest = await this.storeModel
      .findOne({
        merchantId: merchantObjectId,
        billingRequestKey: dto.idempotencyKey,
      })
      .exec()
    if (existingRequest?.isActive) return existingRequest
    if (existingRequest?.subscriptionCode) {
      throw new ConflictException(
        'This store request is already closed. Start a new request.',
      )
    }

    const existingCount = await this.countActive(merchantId)

    if (existingCount === 0) {
      const primarySubscription = user.subscriptions?.find(
        (subscription) =>
          subscription.kind === 'primary' && subscription.status === 'active',
      )
      const store = new this.storeModel({
        merchantId: merchantObjectId,
        name: dto.name,
        address: dto.address,
        location: dto.location,
        isActive: true,
        isPrimary: true,
        billingStatus: 'active',
        billingRequestKey: dto.idempotencyKey,
        subscriptionCode: primarySubscription?.code,
        subscriptionEmailToken: primarySubscription?.emailToken,
      })
      try {
        const saved = await store.save()
        if (primarySubscription?.code) {
          await this.userModel.updateOne(
            {
              _id: merchantObjectId,
              'subscriptions.code': primarySubscription.code,
            },
            {
              $set: {
                'subscriptions.$.kind': 'primary',
                'subscriptions.$.storeId': saved._id,
              },
            },
          )
        }
        return saved
      } catch (error: any) {
        if (error?.code === 11000) {
          throw new ConflictException(
            'A store was created at the same time. Please try again.',
          )
        }
        throw error
      }
    }

    await this.ensurePrimaryStore(merchantId)

    // Adding additional stores beyond the primary store requires PRO MAX and
    // creates an independent Paystack subscription for each extra store.
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
      this.logger.error(
        'Missing PAYSTACK_PLAN_CODE_PROMAX for store subscription',
      )
      throw new ServiceUnavailableException(
        'Store billing is temporarily unavailable.',
      )
    }

    const store =
      existingRequest ||
      new this.storeModel({
        merchantId: merchantObjectId,
        name: dto.name,
        address: dto.address,
        location: dto.location,
        isActive: false,
        isPrimary: false,
        billingStatus: 'pending',
        billingRequestKey: dto.idempotencyKey,
      })
    store.name = dto.name
    store.address = dto.address
    store.location = dto.location
    store.billingStatus = 'pending'
    try {
      await store.save()
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'This store request is already being processed.',
        )
      }
      throw error
    }

    let subscription: { subscriptionCode: string; emailToken: string }
    try {
      subscription = await this.paystackService.createSubscription({
        customer: user.paystackCustomerCode,
        plan: planCode,
        authorization: user.paystackAuthorizationCode,
      })
    } catch (error: any) {
      store.billingStatus = 'failed'
      await store.save()
      this.logger.error(
        `Failed to create subscription for additional store: ${error?.message || error}`,
      )
      throw new BadRequestException(
        error?.response?.data?.message ||
          error?.message ||
          'Could not activate subscription for additional store. Please check your payment method.',
      )
    }

    store.subscriptionCode = subscription.subscriptionCode
    store.subscriptionEmailToken = subscription.emailToken
    store.billingStatus = 'active'
    store.isActive = true
    try {
      await store.save()
    } catch (error) {
      let compensationSucceeded = false
      try {
        const compensation = await this.paystackService.disableSubscription({
          code: subscription.subscriptionCode,
          token: subscription.emailToken,
        })
        if (!compensation.success) {
          throw new Error('Paystack did not confirm compensation')
        }
        await this.storeModel.updateOne(
          { _id: store._id },
          {
            $set: {
              subscriptionCode: subscription.subscriptionCode,
              subscriptionEmailToken: subscription.emailToken,
              billingStatus: 'cancelled',
              isActive: false,
            },
          },
        )
        compensationSucceeded = true
      } catch (compensationError) {
        await this.storeModel.updateOne(
          { _id: store._id },
          {
            $set: {
              subscriptionCode: subscription.subscriptionCode,
              subscriptionEmailToken: subscription.emailToken,
              billingStatus: 'cancellation_pending',
              isActive: false,
            },
          },
        )
        this.logger.error(
          `Could not compensate subscription ${subscription.subscriptionCode}: ${compensationError}`,
        )
      }
      throw new ServiceUnavailableException(
        compensationSucceeded
          ? 'The store could not be activated. Its payment was cancelled.'
          : 'The store could not be activated and its subscription cancellation is pending. Please retry from Stores.',
      )
    }

    const billingUser = await this.userModel.findById(merchantId).exec()
    if (!billingUser) {
      throw new ServiceUnavailableException(
        'The store is active, but its merchant could not be reloaded.',
      )
    }
    if (!billingUser.subscriptions) billingUser.subscriptions = []
    const existingSubscription = billingUser.subscriptions.find(
      (item) => item.code === subscription.subscriptionCode,
    )
    if (existingSubscription) {
      existingSubscription.emailToken = subscription.emailToken
      existingSubscription.planCode = planCode
      existingSubscription.interval = 'monthly'
      existingSubscription.kind = 'branch'
      existingSubscription.storeId = store._id as Types.ObjectId
      existingSubscription.status = 'active'
    } else {
      billingUser.subscriptions.push({
        code: subscription.subscriptionCode,
        emailToken: subscription.emailToken,
        planCode,
        interval: 'monthly',
        kind: 'branch',
        storeId: store._id as Types.ObjectId,
        status: 'active',
        createdAt: new Date(),
      })
    }
    if (
      !billingUser.subscriptionCodes?.includes(subscription.subscriptionCode)
    ) {
      billingUser.subscriptionCodes = [
        ...(billingUser.subscriptionCodes || []),
        subscription.subscriptionCode,
      ]
    }
    try {
      await billingUser.save()
    } catch (error) {
      this.logger.error(
        `Store ${store._id} is active but its user subscription index could not be updated: ${error}`,
      )
      throw new ServiceUnavailableException(
        'The store is active, but setup is still being reconciled. Please retry.',
      )
    }
    return store
  }

  async findAll(merchantId: string): Promise<Store[]> {
    const stores = await this.storeModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: 1 })
      .exec()
    if (stores.length > 0 && !stores.some((store) => store.isPrimary)) {
      const primary = stores[0]
      primary.isPrimary = true
      await primary.save()
    }
    return stores
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
    if (store.isPrimary) {
      throw new BadRequestException(
        'The primary store is managed by the main plan subscription.',
      )
    }
    if (store.subscriptionCode) {
      let token = store.subscriptionEmailToken
      if (!token) {
        const user = await this.userModel.findById(merchantId).exec()
        const sub = user?.subscriptions?.find(
          (s) => s.code === store.subscriptionCode,
        )
        token = sub?.emailToken
      }

      if (!token) {
        try {
          const remote = await this.paystackService.fetchSubscription(
            store.subscriptionCode,
          )
          token = remote?.email_token
        } catch (error) {
          this.logger.warn(
            `Could not recover token for ${store.subscriptionCode}: ${error}`,
          )
        }
      }

      if (!token) {
        throw new ServiceUnavailableException(
          'This store subscription could not be cancelled. Please try again.',
        )
      }

      const previousBillingStatus = store.billingStatus
      store.billingStatus = 'cancellation_pending'
      store.subscriptionEmailToken = token
      await store.save()
      try {
        const result = await this.paystackService.disableSubscription({
          code: store.subscriptionCode,
          token,
        })
        if (!result.success)
          throw new Error('Paystack did not confirm cancellation')
      } catch (error) {
        store.billingStatus =
          previousBillingStatus === 'cancellation_pending'
            ? 'cancellation_pending'
            : 'active'
        await store.save()
        this.logger.error(
          `Failed to disable subscription ${store.subscriptionCode} for store ${store._id}: ${error}`,
        )
        throw new ServiceUnavailableException(
          'This store subscription could not be cancelled. Please try again.',
        )
      }

      await this.userModel.updateOne(
        {
          _id: new Types.ObjectId(merchantId),
          'subscriptions.code': store.subscriptionCode,
        },
        { $set: { 'subscriptions.$.status': 'cancelled' } },
      )
    }

    store.isActive = false
    store.billingStatus = 'cancelled'
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

  async resolveSubscriptionOwnership(
    merchantId: string,
    subscriptionCode: string,
  ): Promise<{ kind: 'primary' | 'branch'; storeId: Types.ObjectId } | null> {
    await this.ensurePrimaryStore(merchantId)
    const store = await this.storeModel
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        subscriptionCode,
      })
      .exec()
    if (!store) return null
    return {
      kind: store.isPrimary ? 'primary' : 'branch',
      storeId: store._id as Types.ObjectId,
    }
  }

  async claimPendingBranchSubscription(
    merchantId: string,
    subscriptionCode: string,
    emailToken?: string,
  ): Promise<StoreDocument | null> {
    return this.storeModel
      .findOneAndUpdate(
        {
          merchantId: new Types.ObjectId(merchantId),
          isPrimary: false,
          billingStatus: 'pending',
        },
        {
          $set: {
            subscriptionCode,
            subscriptionEmailToken: emailToken,
            billingStatus: 'active',
            isActive: true,
          },
        },
        { new: true },
      )
      .exec()
  }

  async attachSubscriptionToPrimaryStore(
    merchantId: string,
    subscriptionCode: string,
    emailToken?: string,
  ): Promise<StoreDocument | null> {
    const primary = await this.ensurePrimaryStore(merchantId)
    if (!primary) return null
    primary.subscriptionCode = subscriptionCode
    primary.subscriptionEmailToken = emailToken
    primary.billingStatus = 'active'
    primary.isActive = true
    await primary.save()
    return primary
  }

  private async ensurePrimaryStore(
    merchantId: string,
  ): Promise<StoreDocument | null> {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const existingPrimary = await this.storeModel
      .findOne({ merchantId: merchantObjectId, isPrimary: true })
      .exec()
    if (existingPrimary) return existingPrimary

    const oldestStore = await this.storeModel
      .findOne({ merchantId: merchantObjectId })
      .sort({ createdAt: 1 })
      .exec()
    if (!oldestStore) return null
    oldestStore.isPrimary = true
    try {
      return await oldestStore.save()
    } catch (error: any) {
      if (error?.code !== 11000) throw error
      return this.storeModel
        .findOne({ merchantId: merchantObjectId, isPrimary: true })
        .exec()
    }
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
      store.billingStatus = 'failed'
      await store.save()
    }
  }

  async reactivateStoreBySubscription(
    merchantId: string,
    subscriptionCode: string,
  ): Promise<void> {
    await this.storeModel.updateOne(
      {
        merchantId: new Types.ObjectId(merchantId),
        subscriptionCode,
        isPrimary: false,
      },
      { $set: { isActive: true, billingStatus: 'active' } },
    )
  }
}
