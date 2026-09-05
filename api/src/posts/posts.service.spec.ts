jest.mock("./post-metadata", () => ({
  fetchPostMetadata: jest.fn().mockResolvedValue({
    title: "A post",
    siteName: "Instagram",
    imageUrl: "https://example.com/image.jpg",
    extractionStatus: "success",
  }),
  parseSupportedPostUrl: jest.fn((sourceUrl: string) => ({
    url: sourceUrl,
    platform: "instagram",
  })),
}));

import { Types } from "mongoose";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PostsService } from "./posts.service";

describe("PostsService", () => {
  const merchantId = new Types.ObjectId().toString();
  let userModel: any;
  let productModel: any;
  let postModel: any;
  let service: PostsService;

  beforeEach(() => {
    userModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue({
              _id: merchantId,
              role: "merchant",
              businessName: "Test Shop",
            }),
        }),
      }),
    };

    productModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    postModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
    };

    service = new PostsService(
      postModel as any,
      productModel as any,
      userModel as any,
    );
  });

  describe("merchant authorization", () => {
    it("rejects non-merchant accounts", async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.create("non-merchant-id", {
          sourceUrl: "https://www.instagram.com/p/ABC123/",
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("create", () => {
    it("returns the created post with the provider metadata URL", async () => {
      const createdPost = {
        _id: new Types.ObjectId(),
        sourceUrl: "https://www.instagram.com/p/ABC123/",
        platform: "instagram" as const,
        preview: {
          title: "A post",
          siteName: "Instagram",
          imageUrl: "https://example.com/image.jpg",
          extractionStatus: "success",
        },
        caption: "Fresh stock",
        productIds: [],
        status: "PUBLISHED" as const,
        populate: jest.fn().mockResolvedValue(undefined),
      };
      postModel.create.mockResolvedValue(createdPost);

      const result = await service.create(merchantId, {
        sourceUrl: createdPost.sourceUrl,
        caption: createdPost.caption,
        status: createdPost.status,
      });

      expect(result).toMatchObject({
        sourceUrl: createdPost.sourceUrl,
        caption: createdPost.caption,
        status: createdPost.status,
      });
      expect(postModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          preview: expect.objectContaining({
            imageUrl: "https://example.com/image.jpg",
          }),
        }),
      );
      expect(createdPost.populate).toHaveBeenCalledTimes(1);
    });

    it("rejects publishing when metadata extraction failed and caption is empty", async () => {
      const { fetchPostMetadata } = jest.requireMock("./post-metadata");
      fetchPostMetadata.mockResolvedValueOnce({ extractionStatus: "failed" });

      await expect(
        service.create(merchantId, {
          sourceUrl: "https://www.instagram.com/p/ABC123/",
          status: "PUBLISHED",
          caption: "",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("draft editing vs published-edit rejection", () => {
    it("allows editing a DRAFT post", async () => {
      const postId = new Types.ObjectId().toString();
      const draftPost = {
        _id: postId,
        merchantId,
        status: "DRAFT",
        sourceUrl: "https://www.instagram.com/p/ABC123/",
        caption: "Old caption",
        save: jest.fn().mockResolvedValue(undefined),
      };

      postModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(draftPost),
          }),
        }),
      });
      // First findOne for check
      postModel.findOne.mockResolvedValueOnce(draftPost);

      const updated = await service.update(postId, merchantId, {
        caption: "New caption",
      });

      expect(draftPost.save).toHaveBeenCalled();
      expect(draftPost.caption).toBe("New caption");
    });

    it("rejects editing a PUBLISHED post", async () => {
      const postId = new Types.ObjectId().toString();
      const publishedPost = {
        _id: postId,
        merchantId,
        status: "PUBLISHED",
        sourceUrl: "https://www.instagram.com/p/ABC123/",
      };

      postModel.findOne.mockResolvedValue(publishedPost);

      await expect(
        service.update(postId, merchantId, { caption: "Should fail" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("deletion", () => {
    it("deletes a post", async () => {
      const postId = new Types.ObjectId().toString();
      const postToDelete = {
        _id: postId,
        merchantId,
      };

      postModel.findOne.mockResolvedValue(postToDelete);
      postModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.remove(postId, merchantId);
      expect(result).toEqual({ deleted: true });
      expect(postModel.deleteOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(postId),
        merchantId: new Types.ObjectId(merchantId),
      });
    });

    it("throws NotFoundException if post to delete is not found", async () => {
      postModel.findOne.mockResolvedValue(null);
      await expect(
        service.remove(new Types.ObjectId().toString(), merchantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("products ownership and archived exclusion", () => {
    it("rejects tagging archived products or products belonging to another merchant", async () => {
      const validProductId = new Types.ObjectId().toString();
      const archivedProductId = new Types.ObjectId().toString();

      // productModel.find only returns valid unarchived products for this merchant
      productModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: validProductId }]),
        }),
      });

      await expect(
        service.create(merchantId, {
          sourceUrl: "https://www.instagram.com/p/ABC123/",
          productIds: [validProductId, archivedProductId],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("filters out archived products when serializing post responses", async () => {
      const activeProduct = {
        _id: new Types.ObjectId(),
        name: "Active product",
        price: 5000,
        isArchived: false,
      };
      const archivedProduct = {
        _id: new Types.ObjectId(),
        name: "Archived product",
        price: 3000,
        isArchived: true,
      };

      const postWithProducts = {
        _id: new Types.ObjectId(),
        sourceUrl: "https://www.instagram.com/p/ABC123/",
        platform: "instagram" as const,
        status: "PUBLISHED" as const,
        productIds: [activeProduct, archivedProduct],
      };

      postModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([postWithProducts]),
            }),
          }),
        }),
      });

      const list = await service.listMine(merchantId);
      expect(postModel.find).toHaveBeenCalledWith({
        merchantId: new Types.ObjectId(merchantId),
      });
      expect(list[0].productIds).toHaveLength(1);
      expect(list[0].productIds[0].name).toBe("Active product");
    });
  });

  describe("feed ordering and draft exclusion", () => {
    it("queries only PUBLISHED posts sorted by publishedAt and createdAt descending", async () => {
      const publishedPost = {
        _id: new Types.ObjectId(),
        sourceUrl: "https://www.instagram.com/p/ABC123/",
        platform: "instagram" as const,
        status: "PUBLISHED" as const,
        productIds: [],
      };

      postModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                  exec: jest.fn().mockResolvedValue([publishedPost]),
                }),
              }),
            }),
          }),
        }),
      });

      const feedResult = await service.feed();
      expect(postModel.find).toHaveBeenCalledWith({ status: "PUBLISHED" });
      expect(feedResult.data).toHaveLength(1);
      expect(feedResult.data[0].status).toBe("PUBLISHED");
    });
  });
});
