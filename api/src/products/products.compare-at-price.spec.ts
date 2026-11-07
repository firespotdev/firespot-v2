import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { Types } from "mongoose";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsService } from "./products.service";

describe("Product compareAtPrice (discounts)", () => {
  const merchantId = String(new Types.ObjectId());
  const productId = String(new Types.ObjectId());
  const categoryId = new Types.ObjectId();

  function setup(storedPrice = 10_000, storedCompareAt: number | null = null) {
    const productModel = {
      create: jest.fn(async (data: Record<string, unknown>) => ({
        _id: new Types.ObjectId(),
        ...data,
        toObject() {
          return { ...this };
        },
      })),
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue({ price: storedPrice, compareAtPrice: storedCompareAt }),
        }),
      }),
      findOneAndUpdate: jest.fn(
        async (_filter: unknown, update: { $set: Record<string, unknown> }) => ({
          _id: new Types.ObjectId(productId),
          price: storedPrice,
          ...update.$set,
          toObject() {
            return { ...this };
          },
        }),
      ),
    };
    const categoryModel = {
      findOne: jest.fn().mockResolvedValue({ _id: categoryId }),
    };
    const service = Object.create(ProductsService.prototype) as ProductsService;
    Object.assign(service, { productModel, categoryModel });
    return { service, productModel };
  }

  describe("DTO", () => {
    it("accepts a multipart string and parses it as a number", () => {
      const dto = plainToInstance(UpdateProductDto, { compareAtPrice: "15000" });
      expect(validateSync(dto)).toEqual([]);
      expect(dto.compareAtPrice).toBe(15000);
    });

    it.each(["", null])("treats %p as clearing the discount", (value) => {
      const dto = plainToInstance(UpdateProductDto, { compareAtPrice: value });
      expect(validateSync(dto)).toEqual([]);
      expect(dto.compareAtPrice).toBeNull();
    });

    it("rejects negative values", () => {
      const dto = plainToInstance(UpdateProductDto, { compareAtPrice: -1 });
      expect(validateSync(dto)).not.toEqual([]);
    });
  });

  describe("create", () => {
    const base = {
      name: "Tote",
      price: 8000,
      categoryId: String(categoryId),
    } as CreateProductDto;

    it("saves a discount higher than the price", async () => {
      const { service, productModel } = setup();
      await service.create(merchantId, { ...base, compareAtPrice: 12000 });
      expect(productModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ price: 8000, compareAtPrice: 12000 }),
      );
    });

    it.each([8000, 5000])(
      "rejects an original price of %p that isn't above the price",
      async (compareAtPrice) => {
        const { service, productModel } = setup();
        await expect(
          service.create(merchantId, { ...base, compareAtPrice }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(productModel.create).not.toHaveBeenCalled();
      },
    );
  });

  describe("update", () => {
    it("checks a new original price against the saved price", async () => {
      const { service, productModel } = setup(10_000);
      await expect(
        service.update(productId, merchantId, { compareAtPrice: 9000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(productModel.findOneAndUpdate).not.toHaveBeenCalled();

      await service.update(productId, merchantId, { compareAtPrice: 15000 });
      expect(productModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it("checks against the new price when both change", async () => {
      const { service } = setup(10_000);
      await expect(
        service.update(productId, merchantId, {
          price: 20000,
          compareAtPrice: 15000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("drops a saved discount that a new price has overtaken", async () => {
      const { service, productModel } = setup(10_000, 15_000);
      await service.update(productId, merchantId, { price: 20_000 });
      expect(productModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
        $set: expect.objectContaining({ price: 20_000, compareAtPrice: null }),
      });
    });

    it("keeps a saved discount that is still above the new price", async () => {
      const { service, productModel } = setup(10_000, 15_000);
      await service.update(productId, merchantId, { price: 12_000 });
      expect(productModel.findOneAndUpdate.mock.calls[0][1].$set).not.toHaveProperty(
        "compareAtPrice",
      );
    });

    it("clears the discount when set to null", async () => {
      const { service, productModel } = setup();
      await service.update(productId, merchantId, { compareAtPrice: null });
      expect(productModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
        $set: expect.objectContaining({ compareAtPrice: null }),
      });
    });
  });
});
