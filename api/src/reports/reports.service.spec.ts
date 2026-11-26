import { ConflictException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { ReportsService } from "./reports.service";
import { nextFollowUpAt } from "./report-rules";

const DAY = 24 * 60 * 60 * 1000;
const customerId = new Types.ObjectId().toString();
const merchantId = new Types.ObjectId();

const makeSale = (daysAgo = 1) => ({
  _id: new Types.ObjectId(),
  merchantId,
  amount: 25000,
  status: "CONFIRMED",
  reference: "FS-3821",
  recordedAt: new Date(Date.now() - daysAgo * DAY),
});

const makeReport = (overrides: Record<string, unknown> = {}) => {
  const report = {
    _id: new Types.ObjectId(),
    saleId: new Types.ObjectId(),
    merchantId,
    customerId: new Types.ObjectId(customerId),
    category: "item_not_received",
    description: "Never arrived",
    status: "pending",
    followUps: [] as Date[],
    closedAt: undefined as Date | undefined,
    createdAt: new Date(),
    save: jest.fn(),
    ...overrides,
  };
  report.save.mockResolvedValue(report);
  return report;
};

// Mongoose queries are thenable and chain .select(); this stands in for both.
const query = <T>(value: T) => {
  const promise = Promise.resolve(value) as Promise<T> & {
    select: () => typeof promise;
    sort: () => typeof promise;
  };
  promise.select = () => promise;
  promise.sort = () => promise;
  return promise;
};

function setup() {
  const reportModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const saleModel = { findOne: jest.fn(), findById: jest.fn() };
  const userModel = {
    findById: jest.fn(() =>
      query({
        _id: merchantId,
        businessName: "Burger King",
        fcmTokens: ["token"],
      }),
    ),
  };
  const cloudinary = { uploadDocument: jest.fn() };
  const firebase = {
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ReportsService(
    reportModel as any,
    saleModel as any,
    userModel as any,
    cloudinary as any,
    firebase as any,
  );
  return { service, reportModel, saleModel, userModel, firebase };
}

describe("report rules", () => {
  it("allows one follow-up a day", () => {
    const now = new Date();
    expect(nextFollowUpAt([], now)).toBeNull();
    expect(
      nextFollowUpAt([new Date(now.getTime() - 2 * 60 * 60 * 1000)], now),
    ).not.toBeNull();
    expect(
      nextFollowUpAt([new Date(now.getTime() - 25 * 60 * 60 * 1000)], now),
    ).toBeNull();
  });
});

describe("ReportsService", () => {
  describe("create", () => {
    const input = (saleId: string) => ({
      saleId,
      category: "item_not_received" as const,
      description: "  Never arrived  ",
    });

    it("files the report and tells the merchant", async () => {
      const { service, saleModel, reportModel, firebase } = setup();
      const sale = makeSale();
      saleModel.findOne.mockResolvedValue(sale);
      reportModel.create.mockImplementation((doc: Record<string, unknown>) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...doc }),
      );

      const report = await service.create(customerId, input(String(sale._id)));

      expect(report).toMatchObject({
        description: "Never arrived",
        status: "pending",
      });
      expect(firebase.sendPushNotification).toHaveBeenCalledWith(
        ["token"],
        "A customer reported an issue",
        expect.stringContaining("Item not received"),
        expect.objectContaining({ type: "report_filed" }),
      );
    });

    it("allows a sale older than 30 days", async () => {
      const { service, saleModel, reportModel } = setup();
      const sale = makeSale(31);
      saleModel.findOne.mockResolvedValue(sale);
      reportModel.create.mockImplementation((doc: Record<string, unknown>) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...doc }),
      );

      await expect(
        service.create(customerId, input(String(sale._id))),
      ).resolves.toBeDefined();
      expect(reportModel.create).toHaveBeenCalled();
    });

    it("refuses a second open report on the same sale", async () => {
      const { service, saleModel, reportModel } = setup();
      const sale = makeSale();
      saleModel.findOne.mockResolvedValue(sale);
      reportModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });

      await expect(
        service.create(customerId, input(String(sale._id))),
      ).rejects.toThrow(ConflictException);
    });

    it("keeps the report when the push fails", async () => {
      const { service, saleModel, reportModel, firebase } = setup();
      const sale = makeSale();
      saleModel.findOne.mockResolvedValue(sale);
      reportModel.create.mockImplementation((doc: Record<string, unknown>) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...doc }),
      );
      firebase.sendPushNotification.mockRejectedValue(new Error("down"));

      await expect(
        service.create(customerId, input(String(sale._id))),
      ).resolves.toBeDefined();
    });
  });

  describe("saleContext", () => {
    it("points to the open report instead of allowing another", async () => {
      const { service, saleModel, reportModel } = setup();
      const sale = makeSale();
      saleModel.findOne.mockResolvedValue(sale);
      const open = makeReport();
      reportModel.findOne.mockReturnValue(query(open));

      const context = await service.saleContext(customerId, String(sale._id));

      expect(context.canReport).toBe(false);
      expect(context.openReport).toEqual({ _id: open._id, status: "pending" });
      expect(context.sale.merchant.businessName).toBe("Burger King");
    });

    it("allows reporting an older sale", async () => {
      const { service, saleModel, reportModel } = setup();
      saleModel.findOne.mockResolvedValue(makeSale(40));
      reportModel.findOne.mockReturnValue(query(null));

      const context = await service.saleContext(
        customerId,
        String(new Types.ObjectId()),
      );

      expect(context.canReport).toBe(true);
      expect(context.openReport).toBeNull();
    });

    it("404s for someone else's sale", async () => {
      const { service, saleModel } = setup();
      saleModel.findOne.mockResolvedValue(null);

      await expect(
        service.saleContext(customerId, String(new Types.ObjectId())),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("followUp and close", () => {
    const withReport = (report: ReturnType<typeof makeReport>) => {
      const ctx = setup();
      ctx.reportModel.findOne.mockResolvedValue(report);
      ctx.saleModel.findById.mockResolvedValue(makeSale());
      return ctx;
    };

    it("records a follow-up once a day", async () => {
      const report = makeReport();
      const { service } = withReport(report);

      const result = await service.followUp(String(report._id), customerId);

      expect(report.followUps).toHaveLength(1);
      expect(result.nextFollowUpAt).not.toBeNull();
      await expect(
        service.followUp(String(report._id), customerId),
      ).rejects.toThrow("already followed up today");
    });

    it("closes an open report", async () => {
      const report = makeReport({ status: "in_review" });
      const { service } = withReport(report);

      const result = await service.close(String(report._id), customerId);

      expect(result.status).toBe("closed");
      expect(report.closedAt).toBeInstanceOf(Date);
    });

    it("won't close or follow up a resolved report", async () => {
      const report = makeReport({ status: "resolved" });
      const { service } = withReport(report);

      await expect(
        service.close(String(report._id), customerId),
      ).rejects.toThrow("no longer open");
      await expect(
        service.followUp(String(report._id), customerId),
      ).rejects.toThrow("no longer open");
    });
  });

  describe("updateByAdmin", () => {
    it("needs a decision to resolve", async () => {
      const { service } = setup();

      await expect(
        service.updateByAdmin(String(new Types.ObjectId()), "admin", {
          status: "resolved",
        }),
      ).rejects.toThrow("Choose who the decision favours");
    });

    it("can't act on a report the customer closed", async () => {
      const { service, reportModel } = setup();
      reportModel.findById.mockResolvedValue(makeReport({ status: "closed" }));

      await expect(
        service.updateByAdmin(String(new Types.ObjectId()), "admin", {
          status: "in_review",
        }),
      ).rejects.toThrow("customer closed");
    });

    it("resolves with a decision and tells the customer", async () => {
      const { service, reportModel, firebase } = setup();
      const report = makeReport({ status: "in_review" });
      reportModel.findById.mockResolvedValue(report);
      reportModel.findByIdAndUpdate.mockResolvedValue({
        ...report,
        status: "resolved",
      });

      await service.updateByAdmin(String(report._id), "admin", {
        status: "resolved",
        decision: "customer",
        resolutionNote: "The shop will refund you.",
      });

      expect(reportModel.findByIdAndUpdate).toHaveBeenCalledWith(
        report._id,
        expect.objectContaining<Record<string, unknown>>({
          $set: expect.objectContaining<Record<string, unknown>>({
            decision: "customer",
            resolutionNote: "The shop will refund you.",
          }),
        }),
        expect.anything(),
      );
      expect(firebase.sendPushNotification).toHaveBeenCalledWith(
        ["token"],
        "Update on your report",
        expect.stringContaining("resolved"),
        expect.objectContaining({ type: "report_updated" }),
      );
    });
  });
});
