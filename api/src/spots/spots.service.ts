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
import { Spot, SpotDocument } from '../schemas/spot.schema'
import { User, UserDocument } from '../schemas/user.schema'
import { PaystackService } from '../users/services/paystack.service'
import { getEffectiveTier } from '../merchant-plans/constants/plans'
import {
  applySpotAddress,
  mainAddressFromSpot,
  spotAddressFromMain,
  type SpotAddress,
} from './spot-address'

type SpotInput = SpotAddress & { name: string; location?: string }

@Injectable()
export class SpotsService {
  private readonly logger = new Logger(SpotsService.name)

  constructor(
    @InjectModel(Spot.name) private spotModel: Model<SpotDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private paystackService: PaystackService,
    private configService: ConfigService,
  ) {}

  async create(
    merchantId: string,
    dto: SpotInput & { idempotencyKey: string },
  ): Promise<Spot> {
    const user = await this.userModel.findById(merchantId).exec()
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (user.role !== 'merchant') {
      throw new ForbiddenException('Only merchants can manage stores.')
    }

    const merchantObjectId = new Types.ObjectId(merchantId)
    const existingRequest = await this.spotModel
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
      const spot = new this.spotModel({
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
      applySpotAddress(spot, dto)
      try {
        const saved = await spot.save()
        await this.syncMainAddress(merchantId, saved, user.mainAddress)
        if (primarySubscription?.code) {
          await this.userModel.updateOne(
            {
              _id: merchantObjectId,
              'subscriptions.code': primarySubscription.code,
            },
            {
              $set: {
                'subscriptions.$.kind': 'primary',
                'subscriptions.$.spotId': saved._id,
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

    await this.ensurePrimarySpot(merchantId)

    // Adding additional spots beyond the primary spot requires PRO MAX and
    // creates an independent Paystack subscription for each extra spot.
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

    const spot =
      existingRequest ||
      new this.spotModel({
        merchantId: merchantObjectId,
        name: dto.name,
        address: dto.address,
        location: dto.location,
        isActive: false,
        isPrimary: false,
        billingStatus: 'pending',
        billingRequestKey: dto.idempotencyKey,
      })
    spot.name = dto.name
    spot.address = dto.address
    spot.location = dto.location
    applySpotAddress(spot, dto)
    spot.billingStatus = 'pending'
    try {
      await spot.save()
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
      spot.billingStatus = 'failed'
      await spot.save()
      this.logger.error(
        `Failed to create subscription for additional spot: ${error?.message || error}`,
      )
      throw new BadRequestException(
        error?.response?.data?.message ||
          error?.message ||
          'Could not activate subscription for additional store. Please check your payment method.',
      )
    }

    spot.subscriptionCode = subscription.subscriptionCode
    spot.subscriptionEmailToken = subscription.emailToken
    spot.billingStatus = 'active'
    spot.isActive = true
    try {
      await spot.save()
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
        await this.spotModel.updateOne(
          { _id: spot._id },
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
        await this.spotModel.updateOne(
          { _id: spot._id },
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
      existingSubscription.spotId = spot._id as Types.ObjectId
      existingSubscription.status = 'active'
    } else {
      billingUser.subscriptions.push({
        code: subscription.subscriptionCode,
        emailToken: subscription.emailToken,
        planCode,
        interval: 'monthly',
        kind: 'branch',
        spotId: spot._id as Types.ObjectId,
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
        `Spot ${spot._id} is active but its user subscription index could not be updated: ${error}`,
      )
      throw new ServiceUnavailableException(
        'The store is active, but setup is still being reconciled. Please retry.',
      )
    }
    return spot
  }

  async findAll(merchantId: string): Promise<Spot[]> {
    const spots = await this.spotModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: 1 })
      .exec()
    if (spots.length === 0) {
      const migrated = await this.spotFromMainAddress(merchantId)
      return migrated ? [migrated] : []
    }
    if (spots.length > 0 && !spots.some((spot) => spot.isPrimary)) {
      const primary = spots[0]
      primary.isPrimary = true
      await primary.save()
    }
    return spots
  }

  async findOne(merchantId: string, id: string): Promise<SpotDocument> {
    const spot = await this.spotModel
      .findOne({
        _id: new Types.ObjectId(id),
        merchantId: new Types.ObjectId(merchantId),
      })
      .exec()
    if (!spot) {
      throw new NotFoundException('Store not found')
    }
    return spot
  }

  async update(
    merchantId: string,
    id: string,
    dto: Partial<SpotInput>,
  ): Promise<Spot> {
    const spot = await this.findOne(merchantId, id)
    const before: SpotAddress = {
      state: spot.state,
      city: spot.city,
      address: spot.address,
    }
    if (dto.name !== undefined) spot.name = dto.name
    if (dto.location !== undefined) spot.location = dto.location
    applySpotAddress(spot, dto)
    const saved = await spot.save()
    if (saved.isPrimary) {
      await this.syncMainAddress(merchantId, saved, before)
    }
    return saved
  }

  /**
   * Keeps the profile's main address in step with the main spot, so Places
   * search, discovery and the shop setup step keep reading one address. A
   * new street address drops the old map pin, as the old form did.
   */
  private async syncMainAddress(
    merchantId: string,
    spot: SpotAddress,
    previous?: SpotAddress,
  ): Promise<void> {
    const moved = (['state', 'city', 'address'] as const).some(
      (field) => (previous?.[field] ?? undefined) !== (spot[field] ?? undefined),
    )
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(merchantId) },
      {
        $set: { mainAddress: mainAddressFromSpot(spot) },
        ...(moved
          ? {
              $unset: {
                mainLocation: '',
                mainLocationAccuracyMeters: '',
                mainLocationCapturedAt: '',
              },
            }
          : {}),
      },
    )
  }

  /**
   * Merchants who saved an address before spots existed get it back as their
   * main spot the first time they list their spots.
   */
  private async spotFromMainAddress(
    merchantId: string,
  ): Promise<SpotDocument | null> {
    const user = await this.userModel.findById(merchantId).exec()
    if (user?.role !== 'merchant' || !user.mainAddress?.address?.trim()) {
      return null
    }
    const spot = new this.spotModel({
      merchantId: new Types.ObjectId(merchantId),
      name: user.businessName?.trim() || 'Main spot',
      isActive: true,
      isPrimary: true,
      billingStatus: 'active',
    })
    applySpotAddress(spot, spotAddressFromMain(user.mainAddress))
    try {
      return await spot.save()
    } catch (error: any) {
      if (error?.code !== 11000) throw error
      return this.spotModel
        .findOne({
          merchantId: new Types.ObjectId(merchantId),
          isPrimary: true,
        })
        .exec()
    }
  }

  /**
   * Deactivates a spot and cancels its paired Paystack subscription if present.
   */
  async deactivate(merchantId: string, id: string): Promise<Spot> {
    const spot = await this.findOne(merchantId, id)
    if (spot.isPrimary) {
      throw new BadRequestException(
        'The primary store is managed by the main plan subscription.',
      )
    }
    if (spot.subscriptionCode) {
      let token = spot.subscriptionEmailToken
      if (!token) {
        const user = await this.userModel.findById(merchantId).exec()
        const sub = user?.subscriptions?.find(
          (s) => s.code === spot.subscriptionCode,
        )
        token = sub?.emailToken
      }

      if (!token) {
        try {
          const remote = await this.paystackService.fetchSubscription(
            spot.subscriptionCode,
          )
          token = remote?.email_token
        } catch (error) {
          this.logger.warn(
            `Could not recover token for ${spot.subscriptionCode}: ${error}`,
          )
        }
      }

      if (!token) {
        throw new ServiceUnavailableException(
          'This store subscription could not be cancelled. Please try again.',
        )
      }

      const previousBillingStatus = spot.billingStatus
      spot.billingStatus = 'cancellation_pending'
      spot.subscriptionEmailToken = token
      await spot.save()
      try {
        const result = await this.paystackService.disableSubscription({
          code: spot.subscriptionCode,
          token,
        })
        if (!result.success)
          throw new Error('Paystack did not confirm cancellation')
      } catch (error) {
        spot.billingStatus =
          previousBillingStatus === 'cancellation_pending'
            ? 'cancellation_pending'
            : 'active'
        await spot.save()
        this.logger.error(
          `Failed to disable subscription ${spot.subscriptionCode} for spot ${spot._id}: ${error}`,
        )
        throw new ServiceUnavailableException(
          'This store subscription could not be cancelled. Please try again.',
        )
      }

      await this.userModel.updateOne(
        {
          _id: new Types.ObjectId(merchantId),
          'subscriptions.code': spot.subscriptionCode,
        },
        { $set: { 'subscriptions.$.status': 'cancelled' } },
      )
    }

    spot.isActive = false
    spot.billingStatus = 'cancelled'
    return spot.save()
  }

  async countActive(merchantId: string): Promise<number> {
    return this.spotModel
      .countDocuments({
        merchantId: new Types.ObjectId(merchantId),
        isActive: true,
      })
      .exec()
  }

  async findBySubscriptionCode(
    subscriptionCode: string,
  ): Promise<SpotDocument | null> {
    return this.spotModel.findOne({ subscriptionCode }).exec()
  }

  async resolveSubscriptionOwnership(
    merchantId: string,
    subscriptionCode: string,
  ): Promise<{ kind: 'primary' | 'branch'; spotId: Types.ObjectId } | null> {
    await this.ensurePrimarySpot(merchantId)
    const spot = await this.spotModel
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        subscriptionCode,
      })
      .exec()
    if (!spot) return null
    return {
      kind: spot.isPrimary ? 'primary' : 'branch',
      spotId: spot._id as Types.ObjectId,
    }
  }

  async claimPendingBranchSubscription(
    merchantId: string,
    subscriptionCode: string,
    emailToken?: string,
  ): Promise<SpotDocument | null> {
    return this.spotModel
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

  async attachSubscriptionToPrimarySpot(
    merchantId: string,
    subscriptionCode: string,
    emailToken?: string,
  ): Promise<SpotDocument | null> {
    const primary = await this.ensurePrimarySpot(merchantId)
    if (!primary) return null
    primary.subscriptionCode = subscriptionCode
    primary.subscriptionEmailToken = emailToken
    primary.billingStatus = 'active'
    primary.isActive = true
    await primary.save()
    return primary
  }

  private async ensurePrimarySpot(
    merchantId: string,
  ): Promise<SpotDocument | null> {
    const merchantObjectId = new Types.ObjectId(merchantId)
    const existingPrimary = await this.spotModel
      .findOne({ merchantId: merchantObjectId, isPrimary: true })
      .exec()
    if (existingPrimary) return existingPrimary

    const oldestSpot = await this.spotModel
      .findOne({ merchantId: merchantObjectId })
      .sort({ createdAt: 1 })
      .exec()
    if (!oldestSpot) return null
    oldestSpot.isPrimary = true
    try {
      return await oldestSpot.save()
    } catch (error: any) {
      if (error?.code !== 11000) throw error
      return this.spotModel
        .findOne({ merchantId: merchantObjectId, isPrimary: true })
        .exec()
    }
  }

  async deactivateSpotBySubscription(
    merchantId: string,
    subscriptionCode: string,
  ): Promise<void> {
    const spot = await this.spotModel.findOne({
      merchantId: new Types.ObjectId(merchantId),
      subscriptionCode,
      isActive: true,
    })
    if (spot) {
      spot.isActive = false
      spot.billingStatus = 'failed'
      await spot.save()
    }
  }

  async reactivateSpotBySubscription(
    merchantId: string,
    subscriptionCode: string,
  ): Promise<void> {
    await this.spotModel.updateOne(
      {
        merchantId: new Types.ObjectId(merchantId),
        subscriptionCode,
        isPrimary: false,
      },
      { $set: { isActive: true, billingStatus: 'active' } },
    )
  }
}
