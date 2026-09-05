import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "../schemas/product.schema";
import { Post, PostDocument, PostStatus } from "../schemas/post.schema";
import { User, UserDocument } from "../schemas/user.schema";
import { CreatePostDto, UpdatePostDto } from "./dto/post.dto";
import { fetchPostMetadata, parseSupportedPostUrl } from "./post-metadata";

interface PopulatedMerchant {
  _id: Types.ObjectId;
  businessName?: string;
  profilePhotoUrl?: string;
  businessImageUrl?: string;
}

interface PopulatedProduct {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isArchived?: boolean;
}

interface PopulatedPost {
  _id: Types.ObjectId;
  sourceUrl: string;
  platform: Post["platform"];
  preview?: Post["preview"];
  caption?: string;
  productIds?: Array<Types.ObjectId | PopulatedProduct>;
  status: PostStatus;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  merchantId?: Types.ObjectId | PopulatedMerchant;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private async assertMerchant(merchantId: string) {
    const merchant = await this.userModel
      .findOne({ _id: merchantId, role: "merchant" })
      .select("businessName profilePhotoUrl businessImageUrl")
      .lean();
    if (!merchant)
      throw new ForbiddenException("Only merchants can manage posts");
    return merchant;
  }

  private sourceInfo(sourceUrl: string) {
    const source = parseSupportedPostUrl(sourceUrl);
    if (!source) {
      throw new BadRequestException(
        "Use a public HTTPS Instagram, Facebook, X, or TikTok post link",
      );
    }
    return source;
  }

  private async assertProductsBelongToMerchant(
    merchantId: string,
    productIds: string[] = [],
  ) {
    const uniqueIds = [...new Set(productIds)];
    if (!uniqueIds.length) return [];

    const products = await this.productModel
      .find({
        _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
        merchantId: new Types.ObjectId(merchantId),
        isArchived: { $ne: true },
      })
      .select("_id")
      .lean();

    if (products.length !== uniqueIds.length) {
      throw new BadRequestException(
        "One or more selected products are unavailable or archived",
      );
    }

    return uniqueIds.map((id) => new Types.ObjectId(id));
  }

  private serialize(post: PopulatedPost) {
    const merchant =
      post.merchantId &&
      typeof post.merchantId === "object" &&
      "businessName" in post.merchantId
        ? post.merchantId
        : undefined;
    const products = Array.isArray(post.productIds)
      ? post.productIds
          .filter(
            (product): product is PopulatedProduct =>
              typeof product === "object" &&
              product !== null &&
              "name" in product &&
              !product.isArchived,
          )
          .map((product) => ({
            _id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            isArchived: false,
          }))
      : [];

    return {
      _id: post._id,
      sourceUrl: post.sourceUrl,
      platform: post.platform,
      preview: post.preview || {},
      caption: post.caption || "",
      productIds: products,
      status: post.status,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      merchant: merchant
        ? {
            _id: merchant._id,
            businessName: merchant.businessName,
            profilePhotoUrl: merchant.profilePhotoUrl,
            businessImageUrl: merchant.businessImageUrl,
          }
        : undefined,
    };
  }

  private async findForMerchant(postId: string, merchantId: string) {
    if (!Types.ObjectId.isValid(postId))
      throw new NotFoundException("Post not found");
    const post = await this.postModel
      .findOne({
        _id: new Types.ObjectId(postId),
        merchantId: new Types.ObjectId(merchantId),
      })
      .populate("merchantId", "businessName profilePhotoUrl businessImageUrl")
      .populate("productIds", "name description price imageUrl isArchived")
      .exec();
    if (!post) throw new NotFoundException("Post not found");
    return post;
  }

  async preview(merchantId: string, sourceUrl: string) {
    await this.assertMerchant(merchantId);
    const source = this.sourceInfo(sourceUrl);
    const preview = await fetchPostMetadata(source);
    return {
      sourceUrl: source.url,
      platform: source.platform,
      preview,
    };
  }

  async create(merchantId: string, dto: CreatePostDto) {
    await this.assertMerchant(merchantId);
    const source = this.sourceInfo(dto.sourceUrl);
    const status: PostStatus = dto.status || "DRAFT";
    const productIds = await this.assertProductsBelongToMerchant(
      merchantId,
      dto.productIds,
    );

    const rawMetadata = await fetchPostMetadata(source);
    if (
      status === "PUBLISHED" &&
      rawMetadata.extractionStatus === "failed" &&
      !dto.caption?.trim()
    ) {
      throw new BadRequestException(
        "Could not retrieve post details from this link. Make sure the post is public.",
      );
    }

    const post = await this.postModel.create({
      merchantId: new Types.ObjectId(merchantId),
      sourceUrl: source.url,
      platform: source.platform,
      preview: rawMetadata,
      caption: dto.caption?.trim() || "",
      productIds,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : undefined,
    });

    await post.populate([
      {
        path: "merchantId",
        select: "businessName profilePhotoUrl businessImageUrl",
      },
      {
        path: "productIds",
        select: "name description price imageUrl isArchived",
      },
    ]);
    return this.serialize(post);
  }

  async listMine(merchantId: string) {
    await this.assertMerchant(merchantId);
    const posts = await this.postModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: -1 })
      .populate("merchantId", "businessName profilePhotoUrl businessImageUrl")
      .populate("productIds", "name description price imageUrl isArchived")
      .exec();
    return posts.map((post) => this.serialize(post));
  }

  async getMine(postId: string, merchantId: string) {
    await this.assertMerchant(merchantId);
    return this.serialize(await this.findForMerchant(postId, merchantId));
  }

  async update(postId: string, merchantId: string, dto: UpdatePostDto) {
    await this.assertMerchant(merchantId);
    if (!Types.ObjectId.isValid(postId)) {
      throw new NotFoundException("Post not found");
    }
    const post = await this.postModel.findOne({
      _id: new Types.ObjectId(postId),
      merchantId: new Types.ObjectId(merchantId),
    });
    if (!post) throw new NotFoundException("Post not found");
    if (post.status !== "DRAFT") {
      throw new ForbiddenException("Published posts cannot be edited");
    }

    if (dto.sourceUrl !== undefined) {
      const source = this.sourceInfo(dto.sourceUrl);
      post.sourceUrl = source.url;
      post.platform = source.platform;
      post.preview = await fetchPostMetadata(source);
    }

    const targetStatus = dto.status ?? post.status;
    if (
      targetStatus === "PUBLISHED" &&
      post.preview?.extractionStatus === "failed" &&
      !(dto.caption !== undefined ? dto.caption.trim() : post.caption?.trim())
    ) {
      throw new BadRequestException(
        "Could not retrieve post details from this link. Make sure the post is public.",
      );
    }

    if (dto.caption !== undefined) post.caption = dto.caption.trim();
    if (dto.productIds !== undefined) {
      post.productIds = await this.assertProductsBelongToMerchant(
        merchantId,
        dto.productIds,
      );
    }
    if (dto.status !== undefined) {
      post.status = dto.status;
      post.publishedAt = dto.status === "PUBLISHED" ? new Date() : undefined;
    }

    await post.save();
    return this.serialize(await this.findForMerchant(postId, merchantId));
  }

  async remove(postId: string, merchantId: string) {
    await this.assertMerchant(merchantId);
    if (!Types.ObjectId.isValid(postId)) {
      throw new NotFoundException("Post not found");
    }
    const post = await this.postModel.findOne({
      _id: new Types.ObjectId(postId),
      merchantId: new Types.ObjectId(merchantId),
    });
    if (!post) throw new NotFoundException("Post not found");

    await this.postModel.deleteOne({
      _id: new Types.ObjectId(postId),
      merchantId: new Types.ObjectId(merchantId),
    });
    return { deleted: true };
  }

  async feed() {
    const posts = await this.postModel
      .find({ status: "PUBLISHED" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(50)
      .populate("merchantId", "businessName profilePhotoUrl businessImageUrl")
      .populate("productIds", "name description price imageUrl isArchived")
      .lean()
      .exec();

    return {
      data: posts.map((post) => this.serialize(post)),
      meta: { limit: 50, total: posts.length },
    };
  }
}
