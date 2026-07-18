import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Customer, CustomerDocument } from "../schemas/customer.schema";
import { AccountLinkingService } from "../account-linking/account-linking.service";

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private accountLinkingService: AccountLinkingService,
  ) {}

  async create(merchantId: string, name: string, phoneNumber: string, email?: string): Promise<Customer> {
    // Resolve (or pre-create) the Firespot account for this number so the sale
    // lands in the customer's own Activity. Best-effort: a linking failure must
    // never block the merchant from recording their customer.
    let userId: Types.ObjectId | undefined;
    try {
      const user =
        await this.accountLinkingService.resolveOrCreateUserByPhone(phoneNumber);
      userId = user?._id as Types.ObjectId | undefined;
    } catch (err) {
      this.logger.warn(
        `Failed to link customer ${phoneNumber} to a Firespot account: ${err}`,
      );
    }

    const customer = new this.customerModel({
      merchantId: new Types.ObjectId(merchantId),
      name,
      phoneNumber,
      email,
      userId,
    });
    return customer.save();
  }

  async findAll(merchantId: string): Promise<Customer[]> {
    return this.customerModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string, merchantId: string): Promise<Customer> {
    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(id),
      merchantId: new Types.ObjectId(merchantId),
    }).exec();
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }
}
