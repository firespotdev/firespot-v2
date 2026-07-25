import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "../schemas/user.schema";
import { QRKit, QRKitDocument } from "../schemas/qrkit.schema";
import { Product, ProductDocument } from "../schemas/product.schema";
import { Agent, AgentDocument } from "../admin/schemas/agent.schema";
import { PaystackService } from "./services/paystack.service";
import { CloudinaryService } from "./services/cloudinary.service";
import { SetupProfileDto } from "./dto/setup-profile.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { VerifyAccountDto } from "./dto/verify-account.dto";
import { customAlphabet } from "nanoid";

const nanoidAlphanumeric = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
);
import { AddBankAccountDto } from "./dto/add-bank-account.dto";
import { UpdateQRKitDto } from "./dto/update-qr-kit.dto";
import {
  getEffectiveTier,
  isLapsed,
  isInGracePeriod,
  getCollectEligibility,
  hasCompletedKyc,
} from "../merchant-plans/constants/plans";
import {
  UpdateContactDto,
  UpdateFulfillmentDto,
  UpdateLocationDto,
} from "./dto/shop-setup.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    private paystackService: PaystackService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async verifyBankAccount(dto: VerifyAccountDto) {
    const result = await this.paystackService.verifyBankAccount(
      dto.accountNumber,
      dto.bankCode,
    );

    return {
      accountName: result.accountName,
      accountNumber: result.accountNumber,
    };
  }

  /**
   * Post-signup onboarding: saves the user's name and marks onboarding
   * complete.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    user.firstName = dto.firstName.trim();
    user.lastName = dto.lastName.trim();
    user.onboardingCompleted = true;
    await user.save();

    return {
      message: "Profile updated successfully",
      user: this.sanitizeUser(user),
    };
  }

  async setupProfile(userId: string, dto: SetupProfileDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    // Check if user has already completed setup
    if (
      user.businessName ||
      (user.bankAccounts && user.bankAccounts.length > 0)
    ) {
      throw new HttpException(
        "Profile setup already completed. Bank details cannot be modified.",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify account number with Paystack
    const verification = await this.paystackService.verifyBankAccount(
      dto.accountNumber,
      dto.bankCode,
    );

    // Handle referral code if provided (referral codes belong to agents)
    let referringAgent: AgentDocument | null = null;
    if (dto.referralCode) {
      referringAgent = await this.agentModel.findOne({
        referralCode: dto.referralCode.toUpperCase(),
      });

      if (!referringAgent) {
        throw new HttpException(
          "Invalid referral code",
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Update user with permanent bank details
    user.businessName = dto.businessName;
    user.businessIndustry = dto.industry;
    user.businessDescription = dto.description;
    if (!user.bankAccounts) {
      user.bankAccounts = [];
    }
    user.bankAccounts.push({
      bankName: dto.bankName,
      bankCode: dto.bankCode,
      accountNumber: dto.accountNumber,
      accountName: verification.accountName,
      isPrimary: true,
    } as any);

    if (referringAgent) {
      user.referredByAgent = referringAgent._id;
    }

    // Becoming a merchant: upgrade role and assign a shareable slug
    user.role = "merchant";
    user.onboardingCompleted = true;
    if (!user.merchantSlug) {
      user.merchantSlug = await this.generateUniqueMerchantSlug();
    }

    await user.save();

    return {
      message: "Profile setup completed successfully",
      user: this.sanitizeUser(user),
    };
  }

  private async generateUniqueMerchantSlug(): Promise<string> {
    while (true) {
      const slug = nanoidAlphanumeric(6);
      const existing = await this.userModel.findOne({ merchantSlug: slug });
      if (!existing) {
        return slug;
      }
    }
  }

  private async getMerchantOrThrow(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }
    return user;
  }

  /** Contact details step: business email, website, social links. */
  async updateContact(userId: string, dto: UpdateContactDto) {
    const user = await this.getMerchantOrThrow(userId);

    if (dto.businessEmail !== undefined) user.businessEmail = dto.businessEmail;
    if (dto.website !== undefined) user.website = dto.website;
    if (dto.socialLinks !== undefined) {
      // Merge so clearing one field doesn't wipe the others.
      user.socialLinks = { ...(user.socialLinks || {}), ...dto.socialLinks };
    }

    await user.save();
    return { user: this.sanitizeUser(user) };
  }

  /** Fulfilment step: how customers get goods/services. */
  async updateFulfillment(userId: string, dto: UpdateFulfillmentDto) {
    const user = await this.getMerchantOrThrow(userId);
    user.fulfillment = { ...(user.fulfillment || {}), ...dto };
    await user.save();
    return { user: this.sanitizeUser(user) };
  }

  /** Location step: primary address, branch count, market/plaza flag. */
  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const user = await this.getMerchantOrThrow(userId);

    const { branchCount, ...address } = dto;
    user.mainAddress = { ...(user.mainAddress || {}), ...address };
    if (branchCount !== undefined) user.branchCount = branchCount;

    await user.save();
    return { user: this.sanitizeUser(user) };
  }

  /** Marks the shop live. Reversible only by support for now. */
  async goLive(userId: string) {
    const user = await this.getMerchantOrThrow(userId);
    if (!user.shopIsLive) {
      user.shopIsLive = true;
      user.shopWentLiveAt = new Date();
      await user.save();
    }
    return { shopIsLive: true, shopWentLiveAt: user.shopWentLiveAt };
  }

  /**
   * The shop-setup checklist. Completion for each actionable item is derived
   * here so the client renders a single server-owned source of truth. The six
   * undesigned items are surfaced as `locked` and excluded from the count.
   */
  async getShopSetup(userId: string) {
    const user = await this.getMerchantOrThrow(userId);
    const merchantId = user._id as Types.ObjectId;

    const [productCount, activeKitCount] = await Promise.all([
      this.productModel.countDocuments({ merchantId }),
      this.qrKitModel.countDocuments({
        merchantId,
        activationStatus: "activated",
      }),
    ]);

    const social = user.socialLinks || {};
    const hasSocial = Object.values(social).some((v) => Boolean(v));

    const actionable = [
      {
        key: "about",
        done: Boolean(
          user.businessName &&
            user.businessDescription &&
            user.businessIndustry,
        ),
      },
      { key: "bank", done: (user.bankAccounts?.length || 0) > 0 },
      { key: "verify", done: hasCompletedKyc(user) },
      {
        key: "contact",
        done: Boolean(user.businessEmail || user.website || hasSocial),
      },
      {
        key: "fulfillment",
        done: Object.values(user.fulfillment || {}).some((v) => Boolean(v)),
      },
      {
        key: "locations",
        done: Boolean(user.mainAddress?.state && user.mainAddress?.address),
      },
      { key: "firstItem", done: productCount > 0 },
      { key: "qrKit", done: activeKitCount > 0 },
    ].map((item) => ({ ...item, locked: false }));

    const locked = [
      "employees",
      "bookings",
      "policies",
      "operatingHours",
      "charges",
      "suppliers",
    ].map((key) => ({ key, done: false, locked: true }));

    const completedCount = actionable.filter((i) => i.done).length;

    return {
      items: [...actionable, ...locked],
      completedCount,
      total: actionable.length,
      isLive: user.shopIsLive === true,
    };
  }

  async updateProfilePhoto(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    // Delete old photo if exists
    if (user.profilePhotoPublicId) {
      await this.cloudinaryService.deleteImage(user.profilePhotoPublicId);
    }

    // Upload new photo
    const upload = await this.cloudinaryService.uploadImage(file.buffer);

    user.profilePhotoUrl = upload.url;
    user.profilePhotoPublicId = upload.publicId;

    await user.save();

    return {
      message: "Profile photo updated successfully",
      profilePhotoUrl: user.profilePhotoUrl,
    };
  }

  async updateProfileBanner(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    if (user.profileBannerPublicId) {
      await this.cloudinaryService.deleteImage(user.profileBannerPublicId);
    }

    const upload = await this.cloudinaryService.uploadBanner(file.buffer);
    user.profileBannerUrl = upload.url;
    user.profileBannerPublicId = upload.publicId;
    await user.save();

    return {
      message: "Profile banner updated successfully",
      profileBannerUrl: user.profileBannerUrl,
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select("-otpCode -otpExpiresAt");

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    return this.sanitizeUser(user);
  }

  async addBankAccount(userId: string, dto: AddBankAccountDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    // Verify account number with Paystack
    const verification = await this.paystackService.verifyBankAccount(
      dto.accountNumber,
      dto.bankCode,
    );

    // Check if account already exists
    const existingAccount = user.bankAccounts?.find(
      (acc) =>
        acc.accountNumber === dto.accountNumber &&
        acc.bankCode === dto.bankCode,
    );

    if (existingAccount) {
      throw new HttpException(
        "This bank account is already added to your profile",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Initialize bankAccounts array if it doesn't exist
    if (!user.bankAccounts) {
      user.bankAccounts = [];
    }

    // If setting as primary, unset other primary accounts
    if (dto.isPrimary) {
      user.bankAccounts.forEach((acc) => {
        acc.isPrimary = false;
      });
    } else if (user.bankAccounts.length === 0) {
      // First account is always primary
      dto.isPrimary = true;
    }

    // Add new bank account
    user.bankAccounts.push({
      bankName: dto.bankName,
      bankCode: dto.bankCode,
      accountNumber: dto.accountNumber,
      accountName: verification.accountName,
      isPrimary: dto.isPrimary || false,
    } as any);

    await user.save();

    return {
      message: "Bank account added successfully",
      bankAccount: {
        bankName: dto.bankName,
        bankCode: dto.bankCode,
        accountNumber: dto.accountNumber,
        accountName: verification.accountName,
        isPrimary: dto.isPrimary || false,
      },
    };
  }

  async getBankAccounts(userId: string) {
    const user = await this.userModel.findById(userId).select("bankAccounts");

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    return {
      bankAccounts: user.bankAccounts || [],
    };
  }

  async setPrimaryBankAccount(userId: string, accountNumber: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    if (!user.bankAccounts || user.bankAccounts.length === 0) {
      throw new HttpException(
        "No bank accounts found. Please add a bank account first.",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Find the account to set as primary
    const account = user.bankAccounts.find(
      (acc) => acc.accountNumber === accountNumber,
    );

    if (!account) {
      throw new HttpException("Bank account not found", HttpStatus.NOT_FOUND);
    }

    // Unset all primary accounts
    user.bankAccounts.forEach((acc) => {
      acc.isPrimary = false;
    });

    // Set the selected account as primary
    account.isPrimary = true;

    await user.save();

    return {
      message: "Primary bank account updated successfully",
      bankAccount: account,
    };
  }

  async deleteBankAccount(userId: string, accountNumber: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    if (!user.bankAccounts || user.bankAccounts.length === 0) {
      throw new HttpException("No bank accounts found", HttpStatus.BAD_REQUEST);
    }

    // Can't delete if it's the only account
    if (user.bankAccounts.length === 1) {
      throw new HttpException(
        "Cannot delete the only bank account. Please add another account first.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const accountIndex = user.bankAccounts.findIndex(
      (acc) => acc.accountNumber === accountNumber,
    );

    if (accountIndex === -1) {
      throw new HttpException("Bank account not found", HttpStatus.NOT_FOUND);
    }

    const wasPrimary = user.bankAccounts[accountIndex].isPrimary;

    // Remove the account
    user.bankAccounts.splice(accountIndex, 1);

    // If deleted account was primary, set first account as primary
    if (wasPrimary && user.bankAccounts.length > 0) {
      user.bankAccounts[0].isPrimary = true;
    }

    await user.save();

    return {
      message: "Bank account deleted successfully",
    };
  }

  async updateMerchantSlug(userId: string, slug: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    // Validate slug format (6 alphanumeric characters)
    if (!/^[A-Z0-9]{6}$/i.test(slug)) {
      throw new HttpException(
        "Merchant slug must be exactly 6 alphanumeric characters",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if slug is already taken
    const existingUser = await this.userModel.findOne({
      merchantSlug: slug.toUpperCase(),
      _id: { $ne: userId },
    });

    if (existingUser) {
      throw new HttpException(
        "This merchant slug is already taken",
        HttpStatus.BAD_REQUEST,
      );
    }

    user.merchantSlug = slug.toUpperCase();
    await user.save();

    return {
      message: "Merchant slug updated successfully",
      merchantSlug: user.merchantSlug,
    };
  }

  async getUserQRKits(userId: string) {
    // Convert string userId to ObjectId for proper querying
    // Mongoose should handle this automatically, but being explicit ensures it works
    const userObjectId = new Types.ObjectId(userId);

    const qrKits = await this.qrKitModel
      .find({ merchantId: userObjectId })
      .sort({ createdAt: -1 })
      .exec();

    return {
      data: qrKits,
      pagination: {
        page: 1,
        limit: qrKits.length,
        total: qrKits.length,
        totalPages: 1,
      },
    };
  }

  async getUserQRKitById(userId: string, qrKitId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const qrKitObjectId = new Types.ObjectId(qrKitId);

    const qrKit = await this.qrKitModel
      .findOne({ _id: qrKitObjectId, merchantId: userObjectId })
      .exec();

    if (!qrKit) {
      throw new HttpException(
        "QR kit not found or does not belong to you",
        HttpStatus.NOT_FOUND,
      );
    }

    return qrKit;
  }

  async updateUserQRKit(userId: string, qrKitId: string, dto: UpdateQRKitDto) {
    const userObjectId = new Types.ObjectId(userId);
    const qrKitObjectId = new Types.ObjectId(qrKitId);

    const qrKit = await this.qrKitModel
      .findOne({ _id: qrKitObjectId, merchantId: userObjectId })
      .exec();

    if (!qrKit) {
      throw new HttpException(
        "QR kit not found or does not belong to you",
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.name !== undefined) {
      qrKit.name = dto.name;
    }

    await qrKit.save();

    return {
      message: "QR kit updated successfully",
      qrKit,
    };
  }

  async registerFcmToken(userId: string, token: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    if (!user.fcmTokens) {
      user.fcmTokens = [];
    }

    // Add token if it doesn't already exist
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
    }

    return { message: "FCM token registered successfully" };
  }

  private toMerchantSummary(merchant: any) {
    return {
      id: merchant._id,
      businessName: merchant.businessName,
      merchantSlug: merchant.merchantSlug,
      profilePhotoUrl: merchant.profilePhotoUrl,
      businessIndustry: merchant.businessIndustry,
    };
  }

  async getFavoriteMerchants(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate(
        "favoriteMerchants",
        "businessName merchantSlug profilePhotoUrl businessIndustry",
      )
      .exec();
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }
    const favorites = (user.favoriteMerchants || []) as any[];
    return { favorites: favorites.map((m) => this.toMerchantSummary(m)) };
  }

  async addFavoriteMerchant(userId: string, merchantId: string) {
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new HttpException("Invalid merchant id", HttpStatus.BAD_REQUEST);
    }
    const merchant = await this.userModel
      .findOne({ _id: merchantId, role: "merchant" })
      .exec();
    if (!merchant) {
      throw new HttpException("Merchant not found", HttpStatus.NOT_FOUND);
    }
    await this.userModel
      .updateOne(
        { _id: userId },
        { $addToSet: { favoriteMerchants: new Types.ObjectId(merchantId) } },
      )
      .exec();
    return this.getFavoriteMerchants(userId);
  }

  async removeFavoriteMerchant(userId: string, merchantId: string) {
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new HttpException("Invalid merchant id", HttpStatus.BAD_REQUEST);
    }
    await this.userModel
      .updateOne(
        { _id: userId },
        { $pull: { favoriteMerchants: new Types.ObjectId(merchantId) } },
      )
      .exec();
    return this.getFavoriteMerchants(userId);
  }

  private sanitizeUser(user: UserDocument) {
    return {
      id: user._id,
      phoneNumber: user.phoneNumber,
      phoneCountryCode: user.phoneCountryCode,
      fullPhoneNumber: user.fullPhoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted === true,
      businessName: user.businessName,
      businessIndustry: user.businessIndustry,
      businessDescription: user.businessDescription,
      // Shop setup fields (drive the setup forms' prefill + the checklist)
      businessEmail: user.businessEmail || null,
      website: user.website || null,
      socialLinks: user.socialLinks || null,
      fulfillment: user.fulfillment || null,
      mainAddress: user.mainAddress || null,
      branchCount: user.branchCount ?? null,
      shopIsLive: user.shopIsLive === true,
      merchantSlug: user.merchantSlug,
      availableKitEntitlements: user.availableKitEntitlements || 0,
      bankAccounts: user.bankAccounts || [],
      profilePhotoUrl: user.profilePhotoUrl,
      profileBannerUrl: user.profileBannerUrl,
      // Merchant plan + verification state (drives the badge and upgrade UI)
      planTier: user.planTier || null,
      planStatus: user.planStatus || "none",
      verificationLevel: user.verificationLevel || null,
      planCurrentPeriodEnd: user.planCurrentPeriodEnd || null,
      // Lapse state. `effectiveTier` is what the merchant can actually use
      // right now; `effectiveVerificationLevel` is null while lapsed so the
      // badge disappears without the UI needing its own rule.
      planGraceUntil: user.planGraceUntil || null,
      effectiveTier: getEffectiveTier(user) || null,
      isLapsed: isLapsed(user),
      isInGracePeriod: isInGracePeriod(user),
      effectiveVerificationLevel: isLapsed(user)
        ? null
        : user.verificationLevel || null,
      // Collecting needs a plan AND completed KYC; recording never does.
      canCollect: getCollectEligibility(user).canCollect,
      collectBlockedReason: getCollectEligibility(user).reason,
      // Used by the client to re-surface the upgrade prompt once per login
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
