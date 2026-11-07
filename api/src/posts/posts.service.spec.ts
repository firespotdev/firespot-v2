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
  let cloudinaryService: any;
  let service: PostsService;

  beforeEach(() => {
    userModel = {
      aggregate: jest.fn(),
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
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

    cloudinaryService = {
      uploadRemoteImage: jest.fn().mockResolvedValue({
        url: "https://res.cloudinary.com/demo/firespot/posts/stored.jpg",
        publicId: "firespot/posts/stored",
      }),
      deleteImage: jest.fn().mockResolvedValue(undefined),
    };

    service = new PostsService(
      postModel as any,
      productModel as any,
      userModel as any,
      cloudinaryService as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
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
    it("returns the created post with its preview image stored on Cloudinary", async () => {
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
            imageUrl: "https://res.cloudinary.com/demo/firespot/posts/stored.jpg",
            imagePublicId: "firespot/posts/stored",
          }),
        }),
      );
      expect(createdPost.populate).toHaveBeenCalledTimes(1);
    });

    it("copies the provider image under a name fixed by merchant and link", async () => {
      postModel.create.mockResolvedValue({ populate: jest.fn() });
      const sourceUrl = "https://www.instagram.com/p/ABC123/";

      await service.create(merchantId, { sourceUrl });
      await service.create(merchantId, { sourceUrl });
      await service.create(new Types.ObjectId().toString(), { sourceUrl });

      const [first, second, otherMerchant] =
        cloudinaryService.uploadRemoteImage.mock.calls;
      expect(first[0]).toBe("https://example.com/image.jpg");
      expect(first[1]).toMatchObject({ folder: "firespot/posts" });
      // Re-posting the same link overwrites one image instead of adding more.
      expect(second[1].publicId).toBe(first[1].publicId);
      expect(otherMerchant[1].publicId).not.toBe(first[1].publicId);
    });

    it("keeps the provider image when copying it fails", async () => {
      cloudinaryService.uploadRemoteImage.mockRejectedValueOnce(
        new Error("fetch failed"),
      );
      postModel.create.mockResolvedValue({ populate: jest.fn() });

      await service.create(merchantId, {
        sourceUrl: "https://www.instagram.com/p/ABC123/",
      });

      const { preview } = postModel.create.mock.calls[0][0];
      expect(preview.imageUrl).toBe("https://example.com/image.jpg");
      expect(preview.imagePublicId).toBeUndefined();
    });

    it("skips copying when the link has no image", async () => {
      const { fetchPostMetadata } = jest.requireMock("./post-metadata");
      fetchPostMetadata.mockResolvedValueOnce({
        title: "Text only",
        extractionStatus: "partial",
      });
      postModel.create.mockResolvedValue({ populate: jest.fn() });

      await service.create(merchantId, {
        sourceUrl: "https://www.instagram.com/p/ABC123/",
      });

      expect(cloudinaryService.uploadRemoteImage).not.toHaveBeenCalled();
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

    it("replaces the stored image when a draft's link changes", async () => {
      const postId = new Types.ObjectId().toString();
      const draftPost = {
        _id: postId,
        merchantId,
        status: "DRAFT",
        sourceUrl: "https://www.instagram.com/p/OLD/",
        preview: { imagePublicId: "firespot/posts/old" },
        caption: "",
        save: jest.fn().mockResolvedValue(undefined),
      };
      postModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(draftPost),
          }),
        }),
      });
      postModel.findOne.mockResolvedValueOnce(draftPost);

      await service.update(postId, merchantId, {
        sourceUrl: "https://www.instagram.com/p/NEW/",
      });

      expect(draftPost.preview).toMatchObject({
        imagePublicId: "firespot/posts/stored",
      });
      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith(
        "firespot/posts/old",
      );
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

    it("deletes the stored image with the post", async () => {
      const postId = new Types.ObjectId().toString();
      postModel.findOne.mockResolvedValue({
        _id: postId,
        merchantId,
        preview: { imagePublicId: "firespot/posts/stored" },
      });
      postModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.remove(postId, merchantId);

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith(
        "firespot/posts/stored",
      );
    });

    it("still deletes the post when removing the image fails", async () => {
      const postId = new Types.ObjectId().toString();
      postModel.findOne.mockResolvedValue({
        _id: postId,
        merchantId,
        preview: { imagePublicId: "firespot/posts/stored" },
      });
      postModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      cloudinaryService.deleteImage.mockRejectedValueOnce(new Error("down"));

      await expect(service.remove(postId, merchantId)).resolves.toEqual({
        deleted: true,
      });
      expect(postModel.deleteOne).toHaveBeenCalled();
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

    it("returns only open merchants near the supplied customer location", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-09-15T12:00:00Z"));
      const nearbyMerchantId = new Types.ObjectId();
      const closedMerchantId = new Types.ObjectId();
      const allDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      userModel.aggregate.mockResolvedValue([
        {
          _id: nearbyMerchantId,
          businessName: "Open Shop",
          distanceMeters: 1240,
          activeHoursSetup: {
            openingHours: {
              timezone: "Africa/Lagos",
              days: allDays.map((day) => ({
                day,
                enabled: true,
                opensAt: "08:00",
                closesAt: "20:00",
                closesNextDay: false,
              })),
            },
          },
        },
        {
          _id: closedMerchantId,
          businessName: "Closed Shop",
          distanceMeters: 500,
          activeHoursSetup: {
            openingHours: {
              timezone: "Africa/Lagos",
              days: allDays.map((day) => ({
                day,
                enabled: true,
                opensAt: "20:00",
                closesAt: "23:00",
                closesNextDay: false,
              })),
            },
          },
        },
      ]);
      const publishedPost = {
        _id: new Types.ObjectId(),
        merchantId: nearbyMerchantId,
        sourceUrl: "https://www.instagram.com/p/ABC123/",
        platform: "instagram" as const,
        status: "PUBLISHED" as const,
        productIds: [],
        publishedAt: new Date(),
      };
      postModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([publishedPost]),
              }),
            }),
          }),
        }),
      });

      const result = await service.feed({
        mode: "open_now",
        latitude: 6.524,
        longitude: 3.379,
      });

      expect(userModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $geoNear: expect.objectContaining({
              maxDistance: 25_000,
              near: {
                type: "Point",
                coordinates: [3.379, 6.524],
              },
            }),
          }),
        ]),
      );
      expect(postModel.find).toHaveBeenCalledWith({
        status: "PUBLISHED",
        merchantId: { $in: [nearbyMerchantId] },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        merchant: { businessName: "Open Shop" },
        distanceKm: 1.2,
      });
    });
  });

  describe("listPublicByMerchant", () => {
    it("returns empty array for invalid merchantId", async () => {
      const result = await service.listPublicByMerchant("not-an-id");
      expect(result).toEqual([]);
    });

    it("returns serialized published posts for merchant", async () => {
      const publishedPost = {
        _id: new Types.ObjectId(),
        sourceUrl: "https://instagram.com/p/test",
        platform: "instagram",
        preview: { title: "Test Post" },
        status: "PUBLISHED" as const,
        productIds: [],
        publishedAt: new Date(),
        merchantId: {
          _id: new Types.ObjectId(merchantId),
          businessName: "Test Merchant",
        },
      };

      postModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([publishedPost]),
              }),
            }),
          }),
        }),
      });

      const result = await service.listPublicByMerchant(merchantId);
      expect(result).toHaveLength(1);
      expect(result[0].preview.title).toBe("Test Post");
    });
  });
});

