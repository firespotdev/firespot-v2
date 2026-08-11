import { PayoutsService } from "./payouts.service";

const query = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe("PayoutsService", () => {
  const userModel = {
    findById: jest.fn(),
  };
  const paystackService = {
    listSettlements: jest.fn(),
    getSettlementTransactions: jest.fn(),
  };
  const saleModel = {
    find: jest.fn(),
  };
  const paystackSubaccountsService = {
    ensureForUser: jest.fn(),
  };

  let service: PayoutsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PayoutsService(
      userModel as any,
      saleModel as any,
      paystackService as any,
      paystackSubaccountsService as any,
    );
  });

  it("returns hasSubaccount: false when user has no paystackSubaccountCode", async () => {
    userModel.findById.mockReturnValue(
      query({ _id: "user1", paystackSubaccountCode: null }),
    );
    paystackSubaccountsService.ensureForUser.mockResolvedValue({
      status: "no_plan",
    });

    const res = await service.getPayouts("user1");
    expect(res).toEqual({
      hasSubaccount: false,
      unavailableReason: "no_plan",
      nextPayout: null,
      settlements: [],
    });
    expect(paystackService.listSettlements).not.toHaveBeenCalled();
  });

  it("fetches and maps settlements when merchant has subaccount", async () => {
    userModel.findById.mockReturnValue(
      query({ _id: "user1", paystackSubaccountCode: "SUB_123" }),
    );

    paystackService.listSettlements.mockResolvedValue({
      data: [
        {
          id: 101,
          domain: "live",
          status: "success",
          total_amount: 500000,
          effective_amount: 480000,
          total_processed: 500000,
          total_fees: 20000,
          settlement_date: "2026-04-15T00:00:00.000Z",
          total_count: 5,
        },
        {
          id: 102,
          domain: "live",
          status: "pending",
          total_amount: 150000,
          settlement_date: "2026-04-16T00:00:00.000Z",
          total_count: 2,
        },
      ],
    });

    const res = await service.getPayouts("user1");

    expect(paystackService.listSettlements).toHaveBeenCalledWith(
      "SUB_123",
      undefined,
    );
    expect(res.hasSubaccount).toBe(true);
    expect(res.settlements).toHaveLength(2);

    // Check mapping
    expect(res.settlements[0]).toMatchObject({
      id: 101,
      status: "Paid",
      amount: 4800,
      grossAmount: 5000,
      fees: 200,
      subaccountCode: "SUB_123",
    });
    expect(res.settlements[1]).toMatchObject({
      id: 102,
      status: "Incoming",
      amount: 1500,
      subaccountCode: "SUB_123",
    });

    // Check estimated next payout
    expect(res.nextPayout).not.toBeNull();
    expect(res.nextPayout?.amount).toBe(1500);
    expect(res.nextPayout?.status).toBe("Incoming");
  });

  it("rejects settlement details not present in the merchant filtered list", async () => {
    userModel.findById.mockReturnValue(
      query({ _id: "user1", paystackSubaccountCode: "SUB_123" }),
    );
    paystackService.listSettlements.mockResolvedValue({
      data: [{ id: 101 }],
      meta: { pageCount: 1 },
    });

    await expect(service.getPayoutDetails("user1", "999")).rejects.toThrow(
      "Settlement does not belong to this merchant",
    );
    expect(paystackService.getSettlementTransactions).not.toHaveBeenCalled();
  });

  it("returns normalized details only after proving settlement ownership", async () => {
    userModel.findById.mockReturnValue(
      query({ _id: "user1", paystackSubaccountCode: "SUB_123" }),
    );
    paystackService.listSettlements.mockResolvedValue({
      data: [
        {
          id: 101,
          status: "success",
          effective_amount: 480000,
          total_processed: 500000,
          total_fees: 20000,
          settlement_date: "2026-04-15T00:00:00.000Z",
        },
      ],
      meta: { pageCount: 1 },
    });
    paystackService.getSettlementTransactions.mockResolvedValue({
      data: [
        {
          id: 55,
          reference: "COL-55",
          status: "success",
          amount: 500000,
          fees: 20000,
          channel: "card",
          paid_at: "2026-04-14T10:00:00.000Z",
        },
      ],
    });
    saleModel.find.mockReturnValue({
      select: jest.fn(() => ({
        lean: jest.fn(() =>
          query([
            {
              paystackReference: "COL-55",
              grossAmount: 5000,
              paystackFee: 999,
              firespotFee: 25,
              netAmount: 3976,
            },
          ]),
        ),
      })),
    });

    const result = await service.getPayoutDetails("user1", "101");

    expect(result.settlement).toMatchObject({
      id: 101,
      amount: 4800,
      grossAmount: 5000,
      fees: 200,
    });
    expect(result.transactions[0]).toMatchObject({
      reference: "COL-55",
      amount: 5000,
      paystackFee: 200,
      firespotFee: 25,
      fees: 225,
      netAmount: 4775,
    });
  });
});
