import { CustomersService } from "./customers.service";

const merchantModel = {
  updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  findById: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ businessName: "Lagos Leaf Café" }),
  }),
};

describe("CustomersService", () => {
  it("upserts a merchant relationship around one global phone identity", async () => {
    const identity = {
      _id: "507f1f77bcf86cd799439015",
      fullPhoneNumber: "+2348031234567",
      profilePhotoUrl: "https://example.com/ada.jpg",
    };
    const relationship = {
      _id: "507f1f77bcf86cd799439014",
      merchantId: "507f1f77bcf86cd799439012",
      userId: identity._id,
      name: "Ada",
      phoneNumber: identity.fullPhoneNumber,
    };
    const exec = jest.fn().mockResolvedValue(relationship);
    const customerModel = {
      exists: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec }),
    };
    const accountLinkingService = {
      resolveOrCreateUserByPhone: jest.fn().mockResolvedValue(identity),
    };
    const service = new CustomersService(
      customerModel as any,
      merchantModel as any,
      {} as any,
      {} as any,
      accountLinkingService as any,
      { sendSms: jest.fn().mockResolvedValue({}) } as any,
    );

    await expect(
      service.create(
        relationship.merchantId,
        relationship.name,
        "08031234567",
      ),
    ).resolves.toEqual({
      ...relationship,
      profilePhotoUrl: identity.profilePhotoUrl,
    });
    expect(accountLinkingService.resolveOrCreateUserByPhone).toHaveBeenCalledWith(
      "08031234567",
    );
    expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: expect.anything(),
        userId: identity._id,
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          name: "Ada",
          phoneNumber: identity.fullPhoneNumber,
        }),
      }),
      expect.objectContaining({ upsert: true, returnDocument: 'after' }),
    );

    await service.create(
      "507f1f77bcf86cd799439013",
      "Ada Okafor",
      "+2348031234567",
    );
    const firstFilter = customerModel.findOneAndUpdate.mock.calls[0][0];
    const secondFilter = customerModel.findOneAndUpdate.mock.calls[1][0];
    expect(firstFilter.userId).toBe(identity._id);
    expect(secondFilter.userId).toBe(identity._id);
    expect(firstFilter.merchantId.toString()).not.toBe(
      secondFilter.merchantId.toString(),
    );
  });

  describe("texting a newly added customer", () => {
    const identity = { _id: "507f1f77bcf86cd799439015", fullPhoneNumber: "+2348031234567" };
    const setup = (alreadySaved: boolean) => {
      const customerModel = {
        exists: jest.fn().mockResolvedValue(alreadySaved ? { _id: "x" } : null),
        findOneAndUpdate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ name: "Ada", userId: identity._id }),
        }),
      };
      const smsService = { sendSms: jest.fn().mockResolvedValue({}) };
      const service = new CustomersService(
        customerModel as any,
        merchantModel as any,
        {} as any,
        {} as any,
        { resolveOrCreateUserByPhone: jest.fn().mockResolvedValue(identity) } as any,
        smsService as any,
      );
      return { service, smsService };
    };

    it("texts a link to their Firespot profile", async () => {
      const { service, smsService } = setup(false);

      await service.create("507f1f77bcf86cd799439012", "Ada", "08031234567");

      expect(smsService.sendSms).toHaveBeenCalledTimes(1);
      const [to, message] = smsService.sendSms.mock.calls[0];
      expect(to).toBe("+2348031234567");
      expect(message).toContain("Lagos Leaf Café");
      expect(message).toContain("/login");
    });

    it("doesn't text once today's 100 invite texts are used", async () => {
      const { service, smsService } = setup(false);
      merchantModel.updateOne.mockResolvedValueOnce({ modifiedCount: 0 });
      merchantModel.updateOne.mockResolvedValueOnce({ modifiedCount: 0 });
      merchantModel.updateOne.mockResolvedValueOnce({ modifiedCount: 0 });

      await expect(
        service.create("507f1f77bcf86cd799439012", "Ada", "08031234567"),
      ).resolves.toMatchObject({ name: "Ada" });
      expect(smsService.sendSms).not.toHaveBeenCalled();
    });

    it("doesn't text a customer the merchant already saved", async () => {
      const { service, smsService } = setup(true);

      await service.create("507f1f77bcf86cd799439012", "Ada O.", "08031234567");

      expect(smsService.sendSms).not.toHaveBeenCalled();
    });

    it("still saves the customer when the text can't be sent", async () => {
      const { service, smsService } = setup(false);
      smsService.sendSms.mockRejectedValue(new Error("Termii is down"));

      await expect(
        service.create("507f1f77bcf86cd799439012", "Ada", "08031234567"),
      ).resolves.toMatchObject({ name: "Ada" });
    });
  });
});
