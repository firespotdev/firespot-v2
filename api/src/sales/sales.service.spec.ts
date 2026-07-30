import { BadRequestException } from "@nestjs/common";
import { SalesService } from "./sales.service";

jest.mock("nanoid", () => ({ nanoid: () => "TEST1234" }));

describe("SalesService amount invariants", () => {
  const customerId = "507f1f77bcf86cd799439014";
  const customerUserId = "507f1f77bcf86cd799439015";
  const createService = (
    saleModel: Record<string, jest.Mock> = {},
    customerModel: Record<string, jest.Mock> = {},
    customersService: Record<string, jest.Mock> = {},
    userModel: Record<string, jest.Mock> = {},
    qrKitModel: Record<string, jest.Mock> = {},
  ) =>
    new SalesService(
      saleModel as any,
      userModel as any,
      qrKitModel as any,
      customerModel as any,
      {
        server: {
          to: jest.fn().mockReturnValue({ emit: jest.fn() }),
        },
      } as any,
      {} as any,
      {} as any,
      {} as any,
      customersService as any,
      { evaluateReferredMerchant: jest.fn().mockResolvedValue(null) } as any,
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
      [
        "has an invalid due date",
        { isPaidInFull: false, amountPaid: 500, dueDate: "not-a-date" },
        true,
      ],
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

    it("allows a partial payment without a due date", () => {
      const service = createService();

      expect(
        normalize(
          service,
          { amount: 1075, isPaidInFull: false, amountPaid: 500 },
          true,
        ),
      ).toEqual({
        total: 1075,
        amountPaid: 500,
        balanceOwed: 575,
        isPaidInFull: false,
      });
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

    it.each([
      ["an uploaded receipt", { receiptUrl: "https://example.com/receipt.png" }],
      ["a payment declaration", { customerMarkedPaidAt: new Date() }],
    ])(
      "does not let a customer cancel after submitting %s",
      async (_, paymentEvidence) => {
        const save = jest.fn();
        const service = createService({
          findOne: jest.fn().mockResolvedValue({
            status: "PENDING",
            ...paymentEvidence,
            save,
          }),
        });

        await expect(
          service.cancelSaleAsCustomer(
            "507f1f77bcf86cd799439013",
            "FS-QR-1",
          ),
        ).rejects.toThrow(
          "This payment has already been submitted and can no longer be cancelled",
        );
        expect(save).not.toHaveBeenCalled();
      },
    );

    it("confirms a description-free QR payment in one tap as a full bank transfer", async () => {
      const merchantId = "507f1f77bcf86cd799439012";
      const saleId = "507f1f77bcf86cd799439013";
      const sale = {
        _id: { toString: () => saleId },
        merchantId: { toString: () => merchantId },
        status: "PENDING",
        amount: 2500,
        description: undefined,
        source: "QR scan",
        targetBankName: "Test Bank",
        serialNumber: "FS-QR-1",
        items: [],
        repayments: [],
        save: jest.fn(),
      };
      sale.save.mockImplementation(async () => sale);
      const findOne = jest.fn().mockResolvedValue(sale);
      const userModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      };
      const service = createService({ findOne }, {}, {}, userModel);

      await expect(service.confirmSale(merchantId, saleId)).resolves.toBe(sale);
      expect(sale.status).toBe("CONFIRMED");
      expect((sale as any).paymentMethod).toBe("Bank Transfer");
      expect((sale as any).amountPaid).toBe(2500);
      expect((sale as any).balanceOwed).toBe(0);
      expect(sale.save).toHaveBeenCalledTimes(1);
    });

    it("does not one-tap confirm an archived pending sale", async () => {
      const service = createService({
        findOne: jest.fn().mockResolvedValue({
          status: "PENDING",
          isArchived: true,
        }),
      });

      await expect(
        service.confirmSale(
          "507f1f77bcf86cd799439012",
          "507f1f77bcf86cd799439013",
        ),
      ).rejects.toThrow("Only an active pending sale can be confirmed");
    });

    it("confirms every active pending sale with one bulk action", async () => {
      const merchantId = "507f1f77bcf86cd799439012";
      const sales = [
        {
          _id: { toString: () => "507f1f77bcf86cd799439013" },
          amount: 1000,
          description: "Bread",
          source: "QR scan",
          items: [],
        },
        {
          _id: { toString: () => "507f1f77bcf86cd799439014" },
          amount: 2500,
          description: "Yam",
          source: "Link shared",
          items: [],
        },
      ];
      const saleModel = {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(sales),
          }),
        }),
      };
      const userModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      };
      const service = createService(saleModel, {}, {}, userModel);
      const recordSale = jest
        .spyOn(service, "recordSale")
        .mockImplementation(async (_merchantId, saleId) => {
          return sales.find((sale) => sale._id.toString() === saleId) as any;
        });

      await expect(service.confirmAllSales(merchantId)).resolves.toEqual({
        confirmed: sales,
        count: 2,
        totalAmount: 3500,
      });
      expect(recordSale).toHaveBeenCalledTimes(2);
      expect(recordSale).toHaveBeenCalledWith(
        merchantId,
        sales[0]._id.toString(),
        expect.objectContaining({
          amount: 1000,
          isPaidInFull: true,
          paymentMethod: "Bank Transfer",
        }),
        true,
      );
    });

    it("archives every active pending sale with one bulk action", async () => {
      const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });
      const service = createService({ updateMany });

      await expect(
        service.archiveAllPendingSales("507f1f77bcf86cd799439012"),
      ).resolves.toEqual({ count: 3 });
      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "PENDING",
          isArchived: { $ne: true },
        }),
        { $set: { isArchived: true } },
      );
    });
  });

  describe("direct sale repayment", () => {
    const createOutstandingSale = () => ({
      _id: { toString: () => "507f1f77bcf86cd799439013" },
      merchantId: { toString: () => "507f1f77bcf86cd799439011" },
      customerId: { toString: () => customerId },
      customerUserId: { toString: () => customerUserId },
      amount: 1075,
      totalDue: 1075,
      amountPaid: 475,
      balanceOwed: 600,
      isPaidInFull: false,
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
          exec: jest
            .fn()
            .mockResolvedValue({ _id: customerId, userId: customerUserId }),
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
          exec: jest
            .fn()
            .mockResolvedValue({ _id: customerId, userId: customerUserId }),
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

    it("returns the updated populated sale instead of the stale primary lookup", async () => {
      const primarySale = createOutstandingSale();
      const updatedSale = createOutstandingSale();
      updatedSale.customerId = {
        toString: () => customerId,
        name: "Ada Customer",
      };
      const saleModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(primarySale),
        }),
        find: jest
          .fn()
          .mockReturnValueOnce({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([updatedSale]),
            }),
          })
          .mockReturnValueOnce({
            exec: jest.fn().mockResolvedValue([updatedSale]),
          }),
      };
      const customerModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValue({ _id: customerId, userId: customerUserId }),
        }),
      };
      const service = createService(saleModel, customerModel);

      const result = await service.recordRepayment(
        "507f1f77bcf86cd799439012",
        "507f1f77bcf86cd799439013",
        { amountPaid: 100, paymentMethod: "Cash" },
      );

      expect(primarySale.balanceOwed).toBe(600);
      expect(result.balanceOwed).toBe(500);
      expect(result.customerId.name).toBe("Ada Customer");
      expect(result.waterfall.totalRemainingBalance).toBe(500);
    });

    it("rejects repayment of a legacy balance with no customer", async () => {
      const sale = createOutstandingSale();
      sale.customerId = undefined;
      sale.customerUserId = undefined;
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
              customerUserId: {
                _id: customerUserId,
                profilePhotoUrl: "https://example.com/ada.jpg",
              },
              customerId: {
                _id: customerId,
                name: "Ada",
                phoneNumber: "08000000000",
              },
            },
            {
              status: "OUTSTANDING",
              balanceOwed: 900,
              customerUserId: undefined,
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
            customerUserId,
            customerName: "Ada",
            customerAvatar: "https://example.com/ada.jpg",
            totalOwed: 500,
          }),
        ],
      });
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "OUTSTANDING",
          isArchived: { $ne: true },
          customerUserId: { $exists: true, $ne: null },
          customerId: { $exists: true, $ne: null },
        }),
      );
    });

    it("archives every active outstanding sale for one customer identity", async () => {
      const merchantId = "507f1f77bcf86cd799439012";
      const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
      const customerModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: customerId,
            userId: customerUserId,
          }),
        }),
      };
      const service = createService({ updateMany }, customerModel);

      await expect(
        service.archiveCustomerOutstandingSales(merchantId, customerId),
      ).resolves.toEqual({ count: 2 });

      expect(updateMany).toHaveBeenCalledWith(
        {
          merchantId: expect.anything(),
          customerUserId: expect.anything(),
          status: "OUTSTANDING",
          isArchived: { $ne: true },
        },
        { $set: { isArchived: true } },
      );
    });
  });

  describe("recent sales queries", () => {
    const merchantId = "507f1f77bcf86cd799439012";

    it("returns confirmed and outstanding sales for the recorded view", async () => {
      const execSales = jest.fn().mockResolvedValue([]);
      const find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({ exec: execSales }),
            }),
          }),
        }),
      });
      const countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      const service = createService({ find, countDocuments });

      await service.getSales(merchantId, { status: "RECORDED" });

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ["CONFIRMED", "OUTSTANDING"] },
          isArchived: { $ne: true },
        }),
      );
    });

    it("returns the amount and count of pending sales", async () => {
      const aggregate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ count: 2, amount: 1500 }]),
      });
      const find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      const service = createService({ aggregate, find });

      await expect(
        service.getSalesStats(merchantId, { preset: "all_time" }),
      ).resolves.toEqual(
        expect.objectContaining({
          pendingSalesCount: 2,
          pendingSalesAmount: 1500,
        }),
      );
      expect(aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          {
            $match: expect.objectContaining({
              status: "PENDING",
              isArchived: { $ne: true },
            }),
          },
        ]),
      );
    });
  });

  describe("authenticated payer identity", () => {
    it("claims a pending sale using the server-authenticated user identity", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const sale = {
        merchantId: "507f1f77bcf86cd799439012",
        customerUserId: undefined,
        customerId: undefined,
        customerName: undefined,
        save,
      };
      const saleModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(sale),
        }),
      };
      const customersService = {
        findOrCreateForUser: jest.fn().mockResolvedValue({
          _id: customerId,
          userId: customerUserId,
          name: "Ada Okafor",
        }),
      };
      const service = createService(saleModel, {}, customersService);

      await expect(
        service.claimSalePayer("507f1f77bcf86cd799439013", customerUserId),
      ).resolves.toEqual({ success: true });
      expect(customersService.findOrCreateForUser).toHaveBeenCalledWith(
        sale.merchantId,
        expect.objectContaining({ toString: expect.any(Function) }),
      );
      expect(sale.customerUserId).toBe(customerUserId);
      expect(sale.customerId).toBe(customerId);
      expect(sale.customerName).toBe("Ada Okafor");
      expect(save).toHaveBeenCalledTimes(1);
    });
  });
});
