import { CustomersService } from "./customers.service";

describe("CustomersService", () => {
  it("upserts a merchant relationship around one global phone identity", async () => {
    const identity = {
      _id: "507f1f77bcf86cd799439015",
      fullPhoneNumber: "+2348031234567",
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
      findOneAndUpdate: jest.fn().mockReturnValue({ exec }),
    };
    const accountLinkingService = {
      resolveOrCreateUserByPhone: jest.fn().mockResolvedValue(identity),
    };
    const service = new CustomersService(
      customerModel as any,
      {} as any,
      accountLinkingService as any,
    );

    await expect(
      service.create(
        relationship.merchantId,
        relationship.name,
        "08031234567",
      ),
    ).resolves.toBe(relationship);
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
      expect.objectContaining({ upsert: true, new: true }),
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
});
