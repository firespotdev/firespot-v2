import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Customer, CustomerDocument } from "../schemas/customer.schema";

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async create(merchantId: string, name: string, phoneNumber: string, email?: string): Promise<Customer> {
    const customer = new this.customerModel({
      merchantId: new Types.ObjectId(merchantId),
      name,
      phoneNumber,
      email,
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
