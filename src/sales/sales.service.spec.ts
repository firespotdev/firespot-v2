import { BadRequestException } from "@nestjs/common";
import { SalesService } from "./sales.service";

jest.mock("nanoid", () => ({ nanoid: () => "TEST1234" }));

describe("SalesService amount invariants", () => {
  const customerId = "507f1f77bcf86cd799439014";
  const createService = (
    saleModel: Record<string, jest.Mock> = {},
    customerModel: Record<string, jest.Mock> = {},
  ) =>
    new SalesService(
      saleModel as any,
      {} as any,
      {} as any,
      customerModel as any,
      {
        server: {
          to: jest.fn().mockReturnValue({ emit: jest.fn() }),
        },
      } as any,
      {} as any,
      {} as any,
      {} as any,
    );

  describe("recorded sale normalization", () => {
    const normalize = (
      service: SalesService,
      values: Record<string, unknown>,
      hasCustomer = false,
    ) =>
      (service as any).normalizeRecordedAmounts(
        {
          amount: 1075,
          description: "Sale",
          paymentMethod: "Cash",
          ...values,
        },
        hasCustomer,
      );

    it("derives a full payment from the total and ignores contradictory client values", () => {
      const service = createService();

      expect(
        normalize(service, {
          isPaidInFull: true,
          amountPaid: 12,
          totalDue: 9999,
          balanceOwed: 88,
        }),
      ).toEqual({
        total: 1075,
        amountPaid: 1075,
        balanceOwed: 0,
        isPaidInFull: true,
      });
    });

    it("derives a partial balance to two decimal places", () => {
      const service = createService();

      expect(
        normalize(
          service,
          {
            amount: 1075.55,
            isPaidInFull: false,
            amountPaid: 500.2,
            dueDate: "2027-01-10",
          },
          true,
        ),
      ).toEqual({
        total: 1075.55,
        amountPaid: 500.2,
        balanceOwed: 575.35,
        isPaidInFull: false,
      });
    });

    it.each([
      [
        "has no customer",
        { isPaidInFull: false, amountPaid: 500, dueDate: "2027-01-10" },
        false,
      ],
      ["has no due date", { isPaidInFull: false, amountPaid: 500 }, true],
      [
        "pays the full total in partial mode",
        {
          isPaidInFull: false,
          amountPaid: 1075,
          dueDate: "2027-01-10",
        },
        true,
      ],
    ])("rejects a partial payment that %s", (_, values, hasCustomer) => {
      const service = createService();

      expect(() => normalize(service, values, hasCustomer)).toThrow(
        BadRequestException,
      );
    });

    it("does not allow a cancelled transaction to be recorded later", async () => {
      const service = createService({
        findOne: jest.fn().mockResolvedValue({ status: "CANCELLED" }),
      });

      await expect(
        service.recordSale(
          "507f1f77bcf86cd799439012",
          "507f1f77bcf86cd799439013",
          {
            amount: 1075,
            description: "Cancelled sale",
            paymentMethod: "Cash",
            isPaidInFull: true,
          },
        ),
      ).rejects.toThrow("Only a pending sale can be recorded");
    });
  });

  describe("direct sale repayment", () => {
    const createOutstandingSale = () => ({
      merchantId: { toString: () => "507f1f77bcf86cd799439011" },
      customerId: { toString: () => customerId },
      amount: 1075,
      totalDue: 1075,
      amountPaid: 475,
      balanceOwed: 600,
      status: "OUTSTANDING",
      paymentMethod: "Cash",
      repayments: [],
      recordedAt: new Date("2026-01-01"),
      createdAt: new Date("2026-01-01"),
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(function (this: Record<string, unknown>) {
        return { ...this };
      }),
    });

    it("rejects an overpayment without mutating the sale", async () => {
      const sale = createOutstandingSale();
      const saleModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(sale),
        }),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([sale]),
          }),
        }),
      };
      const customerModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: customerId }),
        }),
      };
      const service = createService(saleModel, customerModel);

      await expect(
        service.recordRepayment(
          "507f1f77bcf86cd799439012",
          "507f1f77bcf86cd799439013",
          { amountPaid: 600.01, paymentMethod: "Cash" },
        ),
      ).rejects.toThrow("Repayment cannot exceed the outstanding balance");
      expect(sale.save).not.toHaveBeenCalled();
    });

    it("closes the balance exactly and preserves the repayment history", async () => {
      const sale = createOutstandingSale();
      const saleModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(sale),
        }),
        find: jest
          .fn()
          .mockReturnValueOnce({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([sale]),
            }),
          })
          .mockReturnValueOnce({
            exec: jest.fn().mockResolvedValue([sale]),
          }),
      };
      const customerModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: customerId }),
        }),
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      };
      const service = createService(saleModel, customerModel);

      await service.recordRepayment(
        "507f1f77bcf86cd799439012",
        "507f1f77bcf86cd799439013",
        { amountPaid: 600, paymentMethod: "Bank Transfer" },
      );

      expect(sale.amountPaid).toBe(1075);
      expect(sale.balanceOwed).toBe(0);
      expect(sale.status).toBe("CONFIRMED");
      expect(sale.isPaidInFull).toBe(true);
      expect(sale.repayments).toEqual([
        expect.objectContaining({ amount: 475 }),
        expect.objectContaining({
          amount: 600,
          paymentMethod: "Bank Transfer",
        }),
      ]);
      expect(sale.save).toHaveBeenCalledTimes(1);
    });

    it("rejects repayment of a legacy balance with no customer", async () => {
      const sale = createOutstandingSale();
      sale.customerId = undefined;
      const saleModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(sale),
        }),
      };
      const service = createService(saleModel);

      await expect(
        service.recordRepayment(
          "507f1f77bcf86cd799439012",
          "507f1f77bcf86cd799439013",
          { amountPaid: 100, paymentMethod: "Cash" },
        ),
      ).rejects.toThrow(
        "This outstanding balance is not linked to a valid customer",
      );
    });
  });

  describe("outstanding summary", () => {
    it("counts only debts linked to a populated customer", async () => {
      const find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              status: "OUTSTANDING",
              balanceOwed: 500,
              customerId: {
                _id: customerId,
                name: "Ada",
                phoneNumber: "08000000000",
              },
            },
            {
              status: "OUTSTANDING",
              balanceOwed: 900,
              customerId: null,
            },
          ]),
        }),
      });
      const service = createService({ find });

      await expect(
        service.getOutstandingSummary("507f1f77bcf86cd799439012"),
      ).resolves.toEqual({
        totalOutstandingAmount: 500,
        customers: [
          expect.objectContaining({
            customerId,
            customerName: "Ada",
            totalOwed: 500,
          }),
        ],
      });
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "OUTSTANDING",
          customerId: { $exists: true, $ne: null },
        }),
      );
    });
  });
});
