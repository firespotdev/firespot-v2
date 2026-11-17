import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { SavedService } from "./saved.service";

describe("SavedService", () => {
  const userId = new Types.ObjectId().toString();
  const productA = new Types.ObjectId();
  const productB = new Types.ObjectId();
  const postA = new Types.ObjectId();

  const build = (saved: { savedProducts?: unknown[]; savedPosts?: unknown[] }) => {
    const userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ _id: userId, ...saved }),
          }),
        }),
      }),
      updateOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ acknowledged: true }),
      }),
    };
    const productsService = {
      findPublicByIds: jest.fn(async (ids: Types.ObjectId[]) =>
        ids.map((id) => ({
          product: { _id: id, name: `Item ${String(id).slice(-3)}` },
          merchant: { id: "m1", businessName: "Theatre", serialNumber: "FS-1" },
        })),
      ),
    };
    const postsService = {
      findPublishedByIds: jest.fn(async (ids: Types.ObjectId[]) =>
        ids.map((id) => ({ _id: id, status: "PUBLISHED" })),
      ),
    };
    const service = new SavedService(
      userModel as any,
      productsService as any,
      postsService as any,
    );
    return { service, userModel, productsService, postsService };
  };

  it("lists saved items newest first", async () => {
    const { service, productsService } = build({
      savedProducts: [productA, productB],
    });

    const { items } = await service.listItems(userId);

    expect(productsService.findPublicByIds).toHaveBeenCalledWith([
      productB,
      productA,
    ]);
    expect(items.map((item) => String(item.product._id))).toEqual([
      String(productB),
      String(productA),
    ]);
  });

  it("saves an item once it exists", async () => {
    const { service, userModel } = build({ savedProducts: [] });

    await service.saveItem(userId, String(productA));

    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId) },
      { $addToSet: { savedProducts: productA } },
    );
  });

  it("refuses an item that is gone or archived", async () => {
    const { service, productsService, userModel } = build({});
    productsService.findPublicByIds.mockResolvedValueOnce([]);

    await expect(service.saveItem(userId, String(productA))).rejects.toThrow(
      NotFoundException,
    );
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });

  it("refuses an invalid id", async () => {
    const { service } = build({});

    await expect(service.saveItem(userId, "nope")).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.savePost(userId, "nope")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("unsaves an item", async () => {
    const { service, userModel } = build({ savedProducts: [productA] });

    await service.unsaveItem(userId, String(productA));

    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId) },
      { $pull: { savedProducts: productA } },
    );
  });

  it("saves, lists and unsaves posts", async () => {
    const { service, userModel, postsService } = build({ savedPosts: [postA] });

    await service.savePost(userId, String(postA));
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId) },
      { $addToSet: { savedPosts: postA } },
    );

    const { posts } = await service.listPosts(userId);
    expect(postsService.findPublishedByIds).toHaveBeenLastCalledWith([postA]);
    expect(posts).toHaveLength(1);

    await service.unsavePost(userId, String(postA));
    expect(userModel.updateOne).toHaveBeenLastCalledWith(
      { _id: expect.any(Types.ObjectId) },
      { $pull: { savedPosts: postA } },
    );
  });

  it("refuses a post that isn't published", async () => {
    const { service, postsService } = build({});
    postsService.findPublishedByIds.mockResolvedValueOnce([]);

    await expect(service.savePost(userId, String(postA))).rejects.toThrow(
      NotFoundException,
    );
  });
});
