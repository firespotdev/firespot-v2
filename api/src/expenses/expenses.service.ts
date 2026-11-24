import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, QueryFilter, Types } from "mongoose";
import { generateReference } from "../common/reference";
import { Expense, ExpenseDocument } from "../schemas/expense.schema";
import { Supplier, SupplierDocument } from "../schemas/supplier.schema";
import { User, UserDocument } from "../schemas/user.schema";
import {
  ExpensesQueryDto,
  RecordExpenseDto,
  RecordExpenseRepaymentDto,
} from "./dto/expense.dto";

const DEFAULT_LIST_LIMIT = 50;

/** Naira to two decimals, so repeated sums don't drift. */
const money = (value: number) => Math.round(value * 100) / 100;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async record(merchantId: string, dto: RecordExpenseDto) {
    await this.assertMerchant(merchantId);
    const supplier = await this.findSupplier(merchantId, dto.supplierId);
    const payment = this.paymentFor(dto.amount, dto.amountPaid ?? dto.amount);

    const expense = new this.expenseModel({
      merchantId: new Types.ObjectId(merchantId),
      recordedBy: new Types.ObjectId(merchantId),
      reference: generateReference("EXP-", 12),
      amount: money(dto.amount),
      description: dto.description,
      paymentMethod: dto.paymentMethod,
      ...payment,
      ...this.dueDateFor(payment.balanceOwed, dto.dueDate),
      ...supplier,
      location: dto.location,
      recordedAt: new Date(),
      hasBeenEdited: false,
      isArchived: false,
    });
    await expense.save();
    return expense;
  }

  async list(merchantId: string, query: ExpensesQueryDto) {
    const filter: QueryFilter<ExpenseDocument> = {
      merchantId: new Types.ObjectId(merchantId),
      ...(query.includeArchived ? {} : { isArchived: false }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.supplierId
        ? { supplierId: new Types.ObjectId(query.supplierId) }
        : {}),
      ...(query.search
        ? {
            $or: [
              { description: new RegExp(escapeRegex(query.search), "i") },
              { supplierName: new RegExp(escapeRegex(query.search), "i") },
              { reference: new RegExp(escapeRegex(query.search), "i") },
            ],
          }
        : {}),
    };
    return this.expenseModel
      .find(filter)
      .sort({ recordedAt: -1 })
      .limit(query.limit ?? DEFAULT_LIST_LIMIT)
      .lean();
  }

  async findOne(merchantId: string, expenseId: string) {
    if (!Types.ObjectId.isValid(expenseId)) {
      throw new NotFoundException("Expense not found");
    }
    const expense = await this.expenseModel.findOne({
      _id: expenseId,
      merchantId: new Types.ObjectId(merchantId),
    });
    if (!expense) throw new NotFoundException("Expense not found");
    return expense;
  }

  /** An expense can be edited once; after that it is locked. */
  async edit(merchantId: string, expenseId: string, dto: RecordExpenseDto) {
    const expense = await this.findOne(merchantId, expenseId);
    if (expense.isArchived) {
      throw new UnprocessableEntityException(
        "Archived expenses can't be edited",
      );
    }
    if (expense.hasBeenEdited) {
      throw new UnprocessableEntityException(
        "This expense has already been edited once",
      );
    }

    const repaid = (expense.repayments ?? []).reduce(
      (sum, repayment) => sum + repayment.amount,
      0,
    );
    // A full payment covers whatever repayments haven't; repayments are kept.
    const firstPayment = dto.amountPaid ?? Math.max(dto.amount - repaid, 0);
    const payment = this.paymentFor(dto.amount, firstPayment + repaid);
    const supplier = await this.findSupplier(merchantId, dto.supplierId);

    Object.assign(expense, {
      amount: money(dto.amount),
      description: dto.description,
      paymentMethod: dto.paymentMethod,
      ...payment,
      dueDate: this.dueDateFor(payment.balanceOwed, dto.dueDate).dueDate,
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      supplierPhone: supplier.supplierPhone,
      ...(dto.location !== undefined ? { location: dto.location } : {}),
      hasBeenEdited: true,
    });
    await expense.save();
    return expense;
  }

  async archive(merchantId: string, expenseId: string) {
    const expense = await this.findOne(merchantId, expenseId);
    expense.isArchived = true;
    await expense.save();
    return expense;
  }

  async recordRepayment(
    merchantId: string,
    expenseId: string,
    dto: RecordExpenseRepaymentDto,
  ) {
    const expense = await this.findOne(merchantId, expenseId);
    if (expense.isArchived) {
      throw new UnprocessableEntityException(
        "Archived expenses can't take repayments",
      );
    }
    if (money(dto.amount) > expense.balanceOwed) {
      throw new BadRequestException(
        "A repayment can't be more than the balance owed",
      );
    }

    const payment = this.paymentFor(
      expense.amount,
      expense.amountPaid + dto.amount,
    );
    Object.assign(expense, {
      repayments: [
        ...(expense.repayments ?? []),
        {
          amount: money(dto.amount),
          paymentMethod: dto.paymentMethod,
          recordedAt: new Date(),
        },
      ],
      ...payment,
      dueDate: payment.balanceOwed > 0 ? expense.dueDate : undefined,
    });
    await expense.save();
    return expense;
  }

  /** Paid so far, what's left and the status that follows. */
  private paymentFor(amount: number, amountPaid: number) {
    if (amountPaid < 0 || money(amountPaid) > money(amount)) {
      throw new BadRequestException(
        "Amount paid must be between zero and the expense amount",
      );
    }
    const balanceOwed = money(amount - amountPaid);
    return {
      amountPaid: money(amountPaid),
      balanceOwed,
      status: balanceOwed > 0 ? ("OWING" as const) : ("PAID" as const),
    };
  }

  private dueDateFor(balanceOwed: number, dueDate?: string) {
    return {
      dueDate: balanceOwed > 0 && dueDate ? new Date(dueDate) : undefined,
    };
  }

  private async findSupplier(merchantId: string, supplierId?: string) {
    if (!supplierId) {
      return {
        supplierId: undefined,
        supplierName: undefined,
        supplierPhone: undefined,
      };
    }
    const supplier = await this.supplierModel.findOne({
      _id: supplierId,
      merchantId: new Types.ObjectId(merchantId),
    });
    if (!supplier) throw new NotFoundException("Supplier not found");
    return {
      supplierId: supplier._id,
      supplierName: supplier.name,
      supplierPhone: supplier.phoneNumber,
    };
  }

  private async assertMerchant(userId: string) {
    const user = await this.userModel.findById(userId).select("role");
    if (!user) throw new NotFoundException("User not found");
    if (user.role !== "merchant") {
      throw new ForbiddenException("Only businesses can record expenses");
    }
  }
}
