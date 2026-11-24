import { NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { PostsService } from "./posts.service";

describe("PostsService.findPublicById", () => {
  const postId = new Types.ObjectId();

  const build = (posts: unknown[]) => {
    const exec = jest.fn().mockResolvedValue(posts);
    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec,
    };
    const postModel = { find: jest.fn().mockReturnValue(chain) };
    const service = new PostsService(
      postModel as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, postModel };
  };

  it("returns a published post with its shop and items", async () => {
    const { service, postModel } = build([
      {
        _id: postId,
        sourceUrl: "https://vt.tiktok.com/x/",
        platform: "tiktok",
        status: "PUBLISHED",
        caption: "Jollof rice",
        merchantId: { _id: new Types.ObjectId(), businessName: "Theatre of Dreams" },
        productIds: [
          { _id: new Types.ObjectId(), name: "Fresh Milk 1L", price: 2500 },
        ],
      },
    ]);

    const post = await service.findPublicById(String(postId));

    expect(postModel.find).toHaveBeenCalledWith({
      _id: { $in: [postId] },
      status: "PUBLISHED",
    });
    expect(post).toMatchObject({
      caption: "Jollof rice",
      merchant: { businessName: "Theatre of Dreams" },
      productIds: [expect.objectContaining({ name: "Fresh Milk 1L" })],
    });
  });

  it("returns not found for a draft or missing post", async () => {
    const { service } = build([]);

    await expect(service.findPublicById(String(postId))).rejects.toThrow(
      NotFoundException,
    );
  });

  it("returns not found for an invalid id", async () => {
    const { service, postModel } = build([]);

    await expect(service.findPublicById("nope")).rejects.toThrow(
      NotFoundException,
    );
    expect(postModel.find).not.toHaveBeenCalled();
  });
});
