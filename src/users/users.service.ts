import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "../schemas/user.schema";
import { QRKit, QRKitDocument } from "../schemas/qrkit.schema";
import { Agent, AgentDocument } from "../admin/schemas/agent.schema";
import { PaystackService } from "./services/paystack.service";
import { CloudinaryService } from "./services/cloudinary.service";
import { SetupProfileDto } from "./dto/setup-profile.dto";
import { VerifyAccountDto } from "./dto/verify-account.dto";
import { AddBankAccountDto } from "./dto/add-bank-account.dto";
import { UpdateQRKitDto } from "./dto/update-qr-kit.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
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

    await user.save();

    return {
      message: "Profile setup completed successfully",
      user: this.sanitizeUser(user),
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

  private sanitizeUser(user: UserDocument) {
    return {
      id: user._id,
      phoneNumber: user.phoneNumber,
      phoneCountryCode: user.phoneCountryCode,
      fullPhoneNumber: user.fullPhoneNumber,
      businessName: user.businessName,
      merchantSlug: user.merchantSlug,
      availableKitEntitlements: user.availableKitEntitlements || 0,
      bankAccounts: user.bankAccounts || [],
      profilePhotoUrl: user.profilePhotoUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
