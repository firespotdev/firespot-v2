import {
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { Types } from "mongoose";
import { SupplierDto } from "./dto/supplier.dto";
import { SuppliersService } from "./suppliers.service";

type Doc = Record<string, unknown> & { save: jest.Mock };

describe("SuppliersService", () => {
  const merchantId = new Types.ObjectId().toString();

  const created: Doc[] = [];
  const SupplierModel = Object.assign(
    jest.fn().mockImplementation(function (this: Doc, data: object) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
      created.push(this);
    }),
    { findOne: jest.fn(), find: jest.fn(), deleteOne: jest.fn() },
  );
  const userModel = { findById: jest.fn(), updateOne: jest.fn() };
  const smsService = { sendSms: jest.fn() };
  const referrals = { ensureMerchantCode: jest.fn() };
  const service = new SuppliersService(
    SupplierModel as unknown as ConstructorParameters<
      typeof SuppliersService
    >[0],
    userModel as unknown as ConstructorParameters<typeof SuppliersService>[1],
    smsService as unknown as ConstructorParameters<typeof SuppliersService>[2],
    referrals as unknown as ConstructorParameters<typeof SuppliersService>[3],
  );

  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const validate = (value: unknown) =>
    pipe.transform(value, {
      type: "body",
      metatype: SupplierDto,
    }) as Promise<SupplierDto>;

  beforeEach(() => {
    jest.clearAllMocks();
    created.length = 0;
    userModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        role: "merchant",
        businessName: "Lagos Leaf Café",
      }),
    });
    smsService.sendSms.mockResolvedValue({ status: "mock_success" });
    referrals.ensureMerchantCode.mockResolvedValue("FSM-ABC123");
    userModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("saves but doesn't text once today's 100 invite texts are used", async () => {
    userModel.updateOne.mockResolvedValue({ modifiedCount: 0 });
    const dto = await validate({
      name: "Zara Musa",
      phoneNumber: "08032224312",
    });

    const supplier = await service.create(merchantId, dto);

    expect(supplier).toMatchObject({ name: "Zara Musa" });
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });

  it("texts a new supplier a link to their Firespot profile", async () => {
    const dto = await validate({
      name: "Zara Musa",
      phoneNumber: "08032224312",
    });

    await service.create(merchantId, dto);

    expect(smsService.sendSms).toHaveBeenCalledTimes(1);
    const [to, message] = smsService.sendSms.mock.calls[0] as [string, string];
    expect(to).toBe("+2348032224312");
    expect(message).toContain("Lagos Leaf Café");
    expect(message).toContain(
      "/onboarding/merchant/start?mref=FSM-ABC123",
    );
  });

  it("still saves the supplier when the text can't be sent", async () => {
    smsService.sendSms.mockRejectedValue(new Error("Termii is down"));
    const dto = await validate({
      name: "Zara Musa",
      phoneNumber: "08032224312",
    });

    const supplier = await service.create(merchantId, dto);

    expect(supplier).toMatchObject({ name: "Zara Musa" });
    expect(created[0].save).toHaveBeenCalled();
  });

  it("doesn't text the supplier again when their details are edited", async () => {
    SupplierModel.findOne.mockResolvedValue({
      name: "Zara",
      phoneNumber: "+2348032224312",
      save: jest.fn().mockResolvedValue(undefined),
    });
    const dto = await validate({
      name: "Zara Musa",
      phoneNumber: "08032224312",
    });

    await service.update(merchantId, String(new Types.ObjectId()), dto);

    expect(smsService.sendSms).not.toHaveBeenCalled();
  });

  it("saves a supplier with an international phone number", async () => {
    const dto = await validate({
      name: " Zara Musa ",
      phoneNumber: "0803 222 4312",
    });

    const supplier = await service.create(merchantId, dto);

    expect(supplier).toMatchObject({
      name: "Zara Musa",
      phoneNumber: "+2348032224312",
    });
    expect(created[0].save).toHaveBeenCalled();
  });

  it("rejects a phone number that isn't a Nigerian mobile number", async () => {
    const dto = await validate({ name: "Zara Musa", phoneNumber: "12345" });

    await expect(service.create(merchantId, dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("edits only the merchant's own supplier", async () => {
    SupplierModel.findOne.mockResolvedValue(null);
    const dto = await validate({
      name: "Zara Musa",
      phoneNumber: "08032224312",
    });

    await expect(
      service.update(merchantId, String(new Types.ObjectId()), dto),
    ).rejects.toThrow(NotFoundException);
    expect(SupplierModel.findOne).toHaveBeenCalledWith({
      _id: expect.any(String),
      merchantId: expect.any(Types.ObjectId),
    });
  });

  it("deletes the merchant's supplier", async () => {
    SupplierModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await service.remove(merchantId, String(new Types.ObjectId()));

    expect(SupplierModel.deleteOne).toHaveBeenCalledWith({
      _id: expect.any(String),
      merchantId: expect.any(Types.ObjectId),
    });
  });

  it("returns not found when deleting a supplier that isn't theirs", async () => {
    SupplierModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

    await expect(
      service.remove(merchantId, String(new Types.ObjectId())),
    ).rejects.toThrow(NotFoundException);
  });
});
