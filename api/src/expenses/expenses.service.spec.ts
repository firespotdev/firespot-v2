import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
  ValidationPipe,
} from "@nestjs/common";
import { Types } from "mongoose";
import { RecordExpenseDto, RecordExpenseRepaymentDto } from "./dto/expense.dto";
import { ExpensesService } from "./expenses.service";

type Doc = Record<string, unknown> & { save: jest.Mock };

describe("ExpensesService", () => {
  const merchantId = new Types.ObjectId().toString();
  const supplierId = new Types.ObjectId();

  const created: Doc[] = [];
  const ExpenseModel = Object.assign(
    jest.fn().mockImplementation(function (this: Doc, data: object) {
      Object.assign(this, { repayments: [], ...data });
      this.save = jest.fn().mockResolvedValue(this);
      created.push(this);
    }),
    { findOne: jest.fn(), find: jest.fn() },
  );
  const supplierModel = { findOne: jest.fn() };
  const userModel = { findById: jest.fn() };

  const service = new ExpensesService(
    ExpenseModel as unknown as ConstructorParameters<typeof ExpensesService>[0],
    supplierModel as unknown as ConstructorParameters<
      typeof ExpensesService
    >[1],
    userModel as unknown as ConstructorParameters<typeof ExpensesService>[2],
  );

  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const validate = <T>(metatype: new () => T, value: unknown): Promise<T> =>
    pipe.transform(value, { type: "body", metatype }) as Promise<T>;

  const asMerchant = (role = "merchant") =>
    userModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: merchantId, role }),
    });

  const idOf = (doc: Doc) => (doc._id as Types.ObjectId).toHexString();

  const savedExpense = (fields: Record<string, unknown> = {}): Doc => ({
    _id: new Types.ObjectId(),
    merchantId: new Types.ObjectId(merchantId),
    amount: 1000,
    description: "New printers",
    paymentMethod: "Cash",
    amountPaid: 400,
    balanceOwed: 600,
    status: "OWING",
    repayments: [],
    hasBeenEdited: false,
    isArchived: false,
    ...fields,
    save: jest.fn().mockImplementation(function (this: Doc) {
      return Promise.resolve(this);
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    created.length = 0;
    asMerchant();
  });

  describe("record", () => {
    it("records a full payment as paid", async () => {
      const dto = await validate(RecordExpenseDto, {
        amount: 500,
        description: " New printers ",
        paymentMethod: "Bank Transfer",
      });

      const expense = await service.record(merchantId, dto);

      expect(expense).toMatchObject({
        amount: 500,
        description: "New printers",
        amountPaid: 500,
        balanceOwed: 0,
        status: "PAID",
        hasBeenEdited: false,
        isArchived: false,
      });
      expect(expense.reference).toMatch(/^EXP-[0-9A-Z]{12}$/);
      expect(expense.dueDate).toBeUndefined();
      expect(created[0].save).toHaveBeenCalled();
    });

    it("records a part payment as owing, with its due date", async () => {
      const dto = await validate(RecordExpenseDto, {
        amount: 1050,
        description: "Bread and Suya",
        paymentMethod: "POS",
        amountPaid: 750,
        dueDate: "2026-06-22",
      });

      const expense = await service.record(merchantId, dto);

      expect(expense).toMatchObject({
        amountPaid: 750,
        balanceOwed: 300,
        status: "OWING",
      });
      expect(expense.dueDate).toEqual(new Date("2026-06-22"));
    });

    it("drops a due date when nothing is owed", async () => {
      const dto = await validate(RecordExpenseDto, {
        amount: 500,
        description: "Rent",
        paymentMethod: "Cash",
        dueDate: "2026-06-22",
      });

      const expense = await service.record(merchantId, dto);

      expect(expense.dueDate).toBeUndefined();
    });

    it("rejects paying more than the expense", async () => {
      const dto = await validate(RecordExpenseDto, {
        amount: 500,
        description: "Rent",
        paymentMethod: "Cash",
        amountPaid: 600,
      });

      await expect(service.record(merchantId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("copies the merchant's supplier onto the expense", async () => {
      supplierModel.findOne.mockResolvedValue({
        _id: supplierId,
        name: "Ebenezer Izundu and Sons",
        phoneNumber: "+2348032224312",
      });
      const dto = await validate(RecordExpenseDto, {
        amount: 500,
        description: "Flour",
        paymentMethod: "Cash",
        supplierId: String(supplierId),
      });

      const expense = await service.record(merchantId, dto);

      expect(supplierModel.findOne).toHaveBeenCalledWith({
        _id: String(supplierId),
        merchantId: expect.any(Types.ObjectId),
      });
      expect(expense).toMatchObject({
        supplierName: "Ebenezer Izundu and Sons",
        supplierPhone: "+2348032224312",
      });
    });

    it("rejects another merchant's supplier", async () => {
      supplierModel.findOne.mockResolvedValue(null);
      const dto = await validate(RecordExpenseDto, {
        amount: 500,
        description: "Flour",
        paymentMethod: "Cash",
        supplierId: String(supplierId),
      });

      await expect(service.record(merchantId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("only lets merchants record expenses", async () => {
      asMerchant("customer");
      const dto = await validate(RecordExpenseDto, {
        amount: 500,
        description: "Rent",
        paymentMethod: "Cash",
      });

      await expect(service.record(merchantId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("validates the description and method", async () => {
      await expect(
        validate(RecordExpenseDto, {
          amount: 500,
          description: "   ",
          paymentMethod: "Cash",
        }),
      ).rejects.toBeDefined();
      await expect(
        validate(RecordExpenseDto, {
          amount: 500,
          description: "Rent",
          paymentMethod: "Crypto",
        }),
      ).rejects.toBeDefined();
      await expect(
        validate(RecordExpenseDto, {
          amount: 0,
          description: "Rent",
          paymentMethod: "Cash",
        }),
      ).rejects.toBeDefined();
    });
  });

  describe("edit", () => {
    it("edits once, then locks", async () => {
      const expense = savedExpense();
      ExpenseModel.findOne.mockResolvedValue(expense);
      const dto = await validate(RecordExpenseDto, {
        amount: 800,
        description: "Two printers",
        paymentMethod: "POS",
      });

      await service.edit(merchantId, idOf(expense), dto);

      expect(expense).toMatchObject({
        amount: 800,
        description: "Two printers",
        amountPaid: 800,
        balanceOwed: 0,
        status: "PAID",
        hasBeenEdited: true,
      });
      await expect(
        service.edit(merchantId, idOf(expense), dto),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("keeps repayments when editing the first payment", async () => {
      const expense = savedExpense({
        amountPaid: 600,
        balanceOwed: 400,
        repayments: [
          { amount: 200, paymentMethod: "Cash", recordedAt: new Date() },
        ],
      });
      ExpenseModel.findOne.mockResolvedValue(expense);
      const dto = await validate(RecordExpenseDto, {
        amount: 1000,
        description: "New printers",
        paymentMethod: "Cash",
        amountPaid: 300,
      });

      await service.edit(merchantId, idOf(expense), dto);

      expect(expense).toMatchObject({
        amountPaid: 500,
        balanceOwed: 500,
        status: "OWING",
      });
    });

    it("rejects an edit that would make repayments overpay it", async () => {
      const expense = savedExpense({
        amountPaid: 900,
        balanceOwed: 100,
        repayments: [
          { amount: 500, paymentMethod: "Cash", recordedAt: new Date() },
        ],
      });
      ExpenseModel.findOne.mockResolvedValue(expense);
      const dto = await validate(RecordExpenseDto, {
        amount: 400,
        description: "New printers",
        paymentMethod: "Cash",
      });

      await expect(
        service.edit(merchantId, idOf(expense), dto),
      ).rejects.toThrow(BadRequestException);
    });

    it("cannot edit an archived expense", async () => {
      const expense = savedExpense({ isArchived: true });
      ExpenseModel.findOne.mockResolvedValue(expense);
      const dto = await validate(RecordExpenseDto, {
        amount: 800,
        description: "Two printers",
        paymentMethod: "POS",
      });

      await expect(
        service.edit(merchantId, idOf(expense), dto),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe("repayments", () => {
    it("reduces the balance and marks it paid at zero", async () => {
      const expense = savedExpense({ dueDate: new Date("2026-06-22") });
      ExpenseModel.findOne.mockResolvedValue(expense);

      const first = await validate(RecordExpenseRepaymentDto, {
        amount: 100,
        paymentMethod: "Cash",
      });
      await service.recordRepayment(merchantId, idOf(expense), first);
      expect(expense).toMatchObject({
        amountPaid: 500,
        balanceOwed: 500,
        status: "OWING",
      });

      const rest = await validate(RecordExpenseRepaymentDto, {
        amount: 500,
        paymentMethod: "Bank Transfer",
      });
      await service.recordRepayment(merchantId, idOf(expense), rest);
      expect(expense).toMatchObject({
        amountPaid: 1000,
        balanceOwed: 0,
        status: "PAID",
      });
      expect(expense.dueDate).toBeUndefined();
      expect(expense.repayments).toHaveLength(2);
    });

    it("rejects a repayment larger than the balance", async () => {
      const expense = savedExpense();
      ExpenseModel.findOne.mockResolvedValue(expense);
      const dto = await validate(RecordExpenseRepaymentDto, {
        amount: 601,
        paymentMethod: "Cash",
      });

      await expect(
        service.recordRepayment(merchantId, idOf(expense), dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("ownership and archiving", () => {
    it("looks expenses up only within the merchant's own", async () => {
      ExpenseModel.findOne.mockResolvedValue(null);

      await expect(
        service.archive(merchantId, String(new Types.ObjectId())),
      ).rejects.toThrow(NotFoundException);
      expect(ExpenseModel.findOne).toHaveBeenCalledWith({
        _id: expect.any(String),
        merchantId: expect.any(Types.ObjectId),
      });
    });

    it("archives an expense", async () => {
      const expense = savedExpense();
      ExpenseModel.findOne.mockResolvedValue(expense);

      await service.archive(merchantId, idOf(expense));

      expect(expense.isArchived).toBe(true);
      expect(expense.save).toHaveBeenCalled();
    });

    it("returns not found for a malformed id", async () => {
      await expect(service.findOne(merchantId, "not-an-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
