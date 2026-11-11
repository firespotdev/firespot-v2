import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  MerchantCustomer,
  MerchantCustomerDocument,
} from "../schemas/merchant-customer.schema";
import { AccountLinkingService } from "../account-linking/account-linking.service";
import { User, UserDocument } from "../schemas/user.schema";

import { Sale, SaleDocument } from "../schemas/sale.schema";
import { Feedback, FeedbackDocument } from "../schemas/feedback.schema";
import { SmsService } from "../services/sms/sms.service";
import { claimInviteSms } from "../common/invite-sms-quota";

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(MerchantCustomer.name)
    private customerModel: Model<MerchantCustomerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
    private accountLinkingService: AccountLinkingService,
    private smsService: SmsService,
  ) {}

  private toCustomerResponse(customer: any, identity?: any) {
    const value =
      typeof customer?.toObject === "function" ? customer.toObject() : customer;
    const populatedIdentity =
      identity ??
      (value?.userId && typeof value.userId === "object"
        ? value.userId
        : undefined);

    return {
      ...value,
      userId: populatedIdentity?._id ?? value?.userId,
      profilePhotoUrl: populatedIdentity?.profilePhotoUrl,
    };
  }

  async create(
    merchantId: string,
    name: string,
    phoneNumber: string,
  ): Promise<MerchantCustomer> {
    const normalizedName = name.trim();
    const identity =
      await this.accountLinkingService.resolveOrCreateUserByPhone(phoneNumber);

    if (!normalizedName || !identity?._id) {
      throw new BadRequestException("Enter a valid customer name and phone number");
    }

    const alreadySaved = await this.customerModel.exists({
      merchantId: new Types.ObjectId(merchantId),
      userId: identity._id,
    });

    const relationship = await this.customerModel
      .findOneAndUpdate(
        {
          merchantId: new Types.ObjectId(merchantId),
          userId: identity._id,
        },
        {
          $set: {
            name: normalizedName,
            phoneNumber: identity.fullPhoneNumber || phoneNumber,
          },
          $setOnInsert: {
            merchantId: new Types.ObjectId(merchantId),
            userId: identity._id,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .exec();

    if (!alreadySaved) {
      await this.sendInvite(merchantId, identity.fullPhoneNumber || phoneNumber);
    }

    return this.toCustomerResponse(relationship, identity);
  }

  /**
   * Texts a newly added customer a link to sign in to their Firespot profile.
   * A failed text never undoes the save.
   */
  private async sendInvite(merchantId: string, phoneNumber: string) {
    try {
      if (!(await claimInviteSms(this.userModel, merchantId))) {
        this.logger.warn(
          `Merchant ${merchantId} reached today's invite text limit`,
        );
        return;
      }
      const merchant = await this.userModel
        .findById(merchantId)
        .select("businessName");
      const from = merchant?.businessName?.trim() || "A business you buy from";
      const appUrl = (
        process.env.FRONTEND_URL || "https://lite.firespot.co"
      ).replace(/\/$/, "");
      await this.smsService.sendSms(
        phoneNumber,
        `${from} added you as a customer on Firespot. Continue to your Firespot profile: ${appUrl}/login`,
      );
    } catch (error) {
      this.logger.error(
        `Could not text new customer of merchant ${merchantId}: ${String(error)}`,
      );
    }
  }

  async findOrCreateForUser(
    merchantId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<MerchantCustomerDocument | undefined> {
    if (!Types.ObjectId.isValid(userId.toString())) return undefined;

    const identity = await this.userModel
      .findById(new Types.ObjectId(userId.toString()))
      .select("fullName phoneNumber fullPhoneNumber")
      .exec();
    if (!identity) return undefined;

    const merchantObjectId = new Types.ObjectId(merchantId.toString());
    const userObjectId = identity._id as Types.ObjectId;
    const existing = await this.customerModel
      .findOne({ merchantId: merchantObjectId, userId: userObjectId })
      .exec();
    if (existing) return existing;

    const phoneNumber = identity.fullPhoneNumber || identity.phoneNumber;
    const name =
      identity.fullName ||
      phoneNumber;

    return this.customerModel
      .findOneAndUpdate(
        { merchantId: merchantObjectId, userId: userObjectId },
        {
          $setOnInsert: {
            merchantId: merchantObjectId,
            userId: userObjectId,
            name,
            phoneNumber,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .exec();
  }

  async findAll(merchantId: string) {
    const customers = await this.customerModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ name: 1 })
      .populate("userId", "profilePhotoUrl")
      .exec();

    return customers.map((customer) => this.toCustomerResponse(customer));
  }

  async findOne(id: string, merchantId: string) {
    const customer = await this.customerModel
      .findOne({
        _id: new Types.ObjectId(id),
        merchantId: new Types.ObjectId(merchantId),
      })
      .populate("userId", "profilePhotoUrl")
      .exec();
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return this.toCustomerResponse(customer);
  }

  async getCustomerDetails(id: string, merchantId: string) {
    const customer = await this.findOne(id, merchantId);
    const merchantObjId = new Types.ObjectId(merchantId);

    const customerMatchConditions: any[] = [{ customerId: customer._id }];
    if (customer.userId) {
      customerMatchConditions.push({ customerUserId: customer.userId });
    }

    const sales = await this.saleModel
      .find({
        merchantId: merchantObjId,
        $or: customerMatchConditions,
      })
      .sort({ createdAt: -1 })
      .exec();

    const visitCount = sales.length;
    const totalSpent = sales
      .filter((s) => s.status === 'CONFIRMED')
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalOutstanding = sales
      .filter((s) => s.status === 'OUTSTANDING' || (s.balanceOwed && s.balanceOwed > 0))
      .reduce((sum, s) => sum + (s.balanceOwed || 0), 0);

    const feedbackMatchConditions: any[] = [];
    if (customer.userId) {
      feedbackMatchConditions.push({ customerUserId: customer.userId });
    }
    if (customer.name) {
      feedbackMatchConditions.push({ customerName: customer.name });
    }

    const feedback = feedbackMatchConditions.length > 0
      ? await this.feedbackModel
          .find({
            merchantId: merchantObjId,
            $or: feedbackMatchConditions,
          })
          .sort({ createdAt: -1 })
          .exec()
      : [];

    return {
      customer,
      visitCount,
      totalSpent,
      totalOutstanding,
      sales,
      feedback,
    };
  }
}
