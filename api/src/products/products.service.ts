import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "../schemas/product.schema";
import {
  ProductCategory,
  ProductCategoryDocument,
} from "../schemas/product-category.schema";
import { CloudinaryService } from "../users/services/cloudinary.service";
import {
  CreateCategoriesDto,
  CreateProductDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from "./dto/product.dto";

const normaliseName = (value: string) => value.trim().replace(/\s+/g, " ");

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductCategory.name)
    private categoryModel: Model<ProductCategoryDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  private merchantObjectId(merchantId: string) {
    return new Types.ObjectId(merchantId);
  }

  private async assertCategory(
    merchantId: string,
    categoryId?: string,
  ): Promise<Types.ObjectId | undefined> {
    if (!categoryId) return undefined;
    const category = await this.categoryModel.findOne({
      _id: new Types.ObjectId(categoryId),
      merchantId: this.merchantObjectId(merchantId),
    });
    if (!category) throw new BadRequestException("Category not found");
    return category._id;
  }

  private validateOptions(
    dto: Pick<
      CreateProductDto,
      "options" | "variantPriceOverrides" | "excludedVariantKeys"
    >,
  ) {
    const options = dto.options || [];
    const optionIds = new Set<string>();
    const valueIds = new Set<string>();
    for (const option of options) {
      if (
        !option ||
        typeof option.id !== "string" ||
        typeof option.name !== "string" ||
        !Array.isArray(option.values)
      ) {
        throw new BadRequestException(
          "Each option must have an id, name, and values",
        );
      }
      const optionName = normaliseName(option.name).toLowerCase();
      if (!optionName || optionIds.has(option.id)) {
        throw new BadRequestException("Option names and ids must be unique");
      }
      optionIds.add(option.id);
      const seenValues = new Set<string>();
      for (const value of option.values) {
        if (
          !value ||
          typeof value.id !== "string" ||
          typeof value.value !== "string"
        ) {
          throw new BadRequestException(
            "Each option value must have an id and value",
          );
        }
        const normalizedValue = normaliseName(value.value).toLowerCase();
        if (
          !normalizedValue ||
          seenValues.has(normalizedValue) ||
          valueIds.has(value.id)
        ) {
          throw new BadRequestException("Option values must be unique");
        }
        seenValues.add(normalizedValue);
        valueIds.add(value.id);
      }
    }
    const validCombinationKeys = new Set(
      options.length
        ? options
            .reduce<Array<string[]>>(
              (all, option) =>
                all.flatMap((partial) =>
                  option.values.map((value) => [...partial, value.id]),
                ),
              [[]],
            )
            .map((ids) => ids.join("|"))
        : [],
    );
    for (const override of dto.variantPriceOverrides || []) {
      if (
        !override.optionValueIds.every((id) => valueIds.has(id)) ||
        override.optionValueIds.join("|") !== override.combinationKey ||
        !validCombinationKeys.has(override.combinationKey)
      ) {
        throw new BadRequestException(
          "A variant price override references an unknown combination",
        );
      }
    }
    for (const key of dto.excludedVariantKeys || []) {
      if (!validCombinationKeys.has(key)) {
        throw new BadRequestException(
          "An excluded variant references an unknown combination",
        );
      }
    }
  }

  private serialize(product: ProductDocument | any) {
    const object = product.toObject ? product.toObject() : product;
    const options = object.options || [];
    const combinations = options.length
      ? options.reduce(
          (result: Array<Array<{ id: string; value: string }>>, option: any) =>
            result.flatMap((partial) =>
              option.values.map((value: any) => [...partial, value]),
            ),
          [[]],
        )
      : [];
    const overrides = new Map<string, { price: number }>(
      (object.variantPriceOverrides || []).map((override: any) => [
        override.combinationKey,
        override,
      ]),
    );
    const excludedKeys = new Set<string>(object.excludedVariantKeys || []);
    return {
      ...object,
      variants: combinations
        .filter(
          (values) =>
            !excludedKeys.has(values.map((value) => value.id).join("|")),
        )
        .map((values) => {
          const optionValueIds = values.map((value) => value.id);
          const combinationKey = optionValueIds.join("|");
          const override = overrides.get(combinationKey);
          return {
            combinationKey,
            optionValueIds,
            label: values.map((value) => value.value).join(" / "),
            values,
            price: override?.price ?? object.price,
            hasPriceOverride: Boolean(override),
          };
        }),
    };
  }

  async create(
    merchantId: string,
    dto: CreateProductDto,
    imageFile?: Express.Multer.File,
  ) {
    this.validateOptions(dto);
    const categoryId = await this.assertCategory(merchantId, dto.categoryId);
    const image = imageFile
      ? await this.cloudinaryService.uploadImage(
          imageFile.buffer,
          "firespot/products",
        )
      : undefined;
    const product = await this.productModel.create({
      ...dto,
      imageUrl: image?.url,
      name: normaliseName(dto.name),
      description: dto.description?.trim(),
      categoryId: categoryId!,
      merchantId: this.merchantObjectId(merchantId),
      isArchived: false,
    });
    return this.serialize(product);
  }

  async findAll(
    merchantId: string,
    search?: string,
    categoryId?: string,
    archived?: boolean,
  ) {
    const query: Record<string, unknown> = {
      merchantId: this.merchantObjectId(merchantId),
      isArchived: Boolean(archived),
    };
    if (categoryId) query.categoryId = new Types.ObjectId(categoryId);
    if (search?.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }
    const products = await this.productModel
      .find(query)
      .populate("categoryId", "name")
      .sort({ name: 1 })
      .exec();
    return products.map((product) => this.serialize(product));
  }

  async findPublicCatalogue(merchantId: string) {
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new NotFoundException("Merchant catalogue not found");
    }

    const merchantObjectId = this.merchantObjectId(merchantId);
    const [categories, products] = await Promise.all([
      this.categoryModel
        .find({ merchantId: merchantObjectId })
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      this.productModel
        .find({ merchantId: merchantObjectId, isArchived: false })
        .sort({ name: 1 })
        .exec(),
    ]);

    const productCounts = new Map<string, number>();
    for (const product of products) {
      const categoryId = String(product.categoryId || "");
      productCounts.set(categoryId, (productCounts.get(categoryId) || 0) + 1);
    }

    return {
      categories: categories.map((category) => ({
        _id: category._id,
        name: category.name,
        sortOrder: category.sortOrder,
        productCount: productCounts.get(String(category._id)) || 0,
      })),
      products: products.map((product) => {
        const serialized = this.serialize(product);
        return {
          _id: serialized._id,
          name: serialized.name,
          description: serialized.description,
          price: serialized.price,
          imageUrl: serialized.imageUrl,
          categoryId: serialized.categoryId,
          isArchived: false,
          options: serialized.options || [],
          variantPriceOverrides: serialized.variantPriceOverrides || [],
          excludedVariantKeys: serialized.excludedVariantKeys || [],
          variants: serialized.variants || [],
          createdAt: serialized.createdAt,
          updatedAt: serialized.updatedAt,
        };
      }),
    };
  }

  async update(
    id: string,
    merchantId: string,
    dto: UpdateProductDto,
    imageFile?: Express.Multer.File,
  ) {
    this.validateOptions(dto);
    const categoryId = await this.assertCategory(merchantId, dto.categoryId);
    const image = imageFile
      ? await this.cloudinaryService.uploadImage(
          imageFile.buffer,
          "firespot/products",
        )
      : undefined;
    const data: Record<string, unknown> = { ...dto };
    if (image) data.imageUrl = image.url;
    if (dto.name) data.name = normaliseName(dto.name);
    if (dto.description !== undefined)
      data.description = dto.description.trim();
    if (dto.categoryId !== undefined) data.categoryId = categoryId;
    const product = await this.productModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        merchantId: this.merchantObjectId(merchantId),
      },
      { $set: data },
      { returnDocument: "after" },
    );
    if (!product) throw new NotFoundException("Product not found");
    return this.serialize(product);
  }

  async archive(id: string, merchantId: string) {
    const product = await this.productModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        merchantId: this.merchantObjectId(merchantId),
      },
      { $set: { isArchived: true, archivedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!product) throw new NotFoundException("Product not found");
    return this.serialize(product);
  }

  async restore(id: string, merchantId: string, categoryId: string) {
    const category = await this.assertCategory(merchantId, categoryId);
    const product = await this.productModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        merchantId: this.merchantObjectId(merchantId),
      },
      {
        $set: {
          isArchived: false,
          archivedAt: undefined,
          categoryId: category,
        },
      },
      { returnDocument: "after" },
    );
    if (!product) throw new NotFoundException("Product not found");
    return this.serialize(product);
  }

  async createCategories(merchantId: string, dto: CreateCategoriesDto) {
    const names = [...new Set(dto.names.map(normaliseName).filter(Boolean))];
    if (!names.length)
      throw new BadRequestException("Enter at least one category name");
    const merchantObjectId = this.merchantObjectId(merchantId);
    const existing = await this.categoryModel
      .find({ merchantId: merchantObjectId })
      .sort({ sortOrder: -1 })
      .limit(1);
    const startOrder = existing[0]?.sortOrder ?? -1;
    try {
      return await this.categoryModel.insertMany(
        names.map((name, index) => ({
          merchantId: merchantObjectId,
          name,
          sortOrder: startOrder + index + 1,
        })),
      );
    } catch (error: any) {
      if (error?.code === 11000)
        throw new BadRequestException(
          "A category with that name already exists",
        );
      throw error;
    }
  }

  async listCategories(merchantId: string, search?: string) {
    const merchantObjectId = this.merchantObjectId(merchantId);
    const categoryQuery: Record<string, unknown> = {
      merchantId: merchantObjectId,
    };
    if (search?.trim())
      categoryQuery.name = { $regex: search.trim(), $options: "i" };
    const categories = await this.categoryModel
      .find(categoryQuery)
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    const counts = await this.productModel.aggregate([
      { $match: { merchantId: merchantObjectId, isArchived: false } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(
      counts.map((item) => [String(item._id), item.count]),
    );
    const archivedCount = await this.productModel.countDocuments({
      merchantId: merchantObjectId,
      isArchived: true,
    });
    return {
      categories: categories.map((category) => ({
        ...category,
        productCount: countByCategory.get(String(category._id)) || 0,
      })),
      archivedCount,
    };
  }

  async updateCategory(id: string, merchantId: string, dto: UpdateCategoryDto) {
    const category = await this.categoryModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        merchantId: this.merchantObjectId(merchantId),
      },
      { $set: { name: normaliseName(dto.name) } },
      { returnDocument: "after" },
    );
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async deleteCategory(id: string, merchantId: string) {
    const merchantObjectId = this.merchantObjectId(merchantId);
    const category = await this.categoryModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      merchantId: merchantObjectId,
    });
    if (!category) throw new NotFoundException("Category not found");
    const result = await this.productModel.updateMany(
      {
        merchantId: merchantObjectId,
        categoryId: category._id,
        isArchived: false,
      },
      { $set: { isArchived: true, archivedAt: new Date() } },
    );
    return { archivedProductCount: result.modifiedCount };
  }
}
