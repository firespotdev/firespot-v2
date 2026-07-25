import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(MerchantCustomer.name)
    private customerModel: Model<MerchantCustomerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private accountLinkingService: AccountLinkingService,
  ) {}

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
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    return relationship;
  }

  async findOrCreateForUser(
    merchantId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<MerchantCustomerDocument | undefined> {
    if (!Types.ObjectId.isValid(userId.toString())) return undefined;

    const identity = await this.userModel
      .findById(new Types.ObjectId(userId.toString()))
      .select("firstName lastName phoneNumber fullPhoneNumber")
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
      [identity.firstName, identity.lastName].filter(Boolean).join(" ") ||
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
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async findAll(merchantId: string): Promise<MerchantCustomer[]> {
    return this.customerModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string, merchantId: string): Promise<MerchantCustomer> {
    const customer = await this.customerModel
      .findOne({
        _id: new Types.ObjectId(id),
        merchantId: new Types.ObjectId(merchantId),
      })
      .exec();
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }
}
