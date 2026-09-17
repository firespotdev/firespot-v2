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
import { CreatePostDto, PostFeedQueryDto, UpdatePostDto } from "./dto/post.dto";
import { fetchPostMetadata, parseSupportedPostUrl } from "./post-metadata";

const NEARBY_RADIUS_METERS = 25_000;
const FEED_LIMIT = 50;
const DAY_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface OpeningDay {
  day: string;
  enabled: boolean;
  opensAt?: string;
  closesAt?: string;
  closesNextDay?: boolean;
}

interface NearbyMerchant extends PopulatedMerchant {
  distanceMeters: number;
  activeHoursSetup?: {
    openingHours?: {
      timezone?: string;
      days?: OpeningDay[];
    };
  };
}

const timeToMinutes = (value?: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value || "");
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const isOpenAt = (merchant: NearbyMerchant, now = new Date()) => {
  const openingHours = merchant.activeHoursSetup?.openingHours;
  if (!openingHours?.days?.length) return false;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: openingHours.timezone || "Africa/Lagos",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const day = (parts.find((part) => part.type === "weekday")?.value || "")
      .slice(0, 3)
      .toUpperCase();
    const hours = Number(
      parts.find((part) => part.type === "hour")?.value || "0",
    );
    const minutes = Number(
      parts.find((part) => part.type === "minute")?.value || "0",
    );
    const minuteOfDay = hours * 60 + minutes;
    const todayIndex = DAY_ORDER.indexOf(day);
    if (todayIndex < 0) return false;

    const today = openingHours.days.find((entry) => entry.day === day);
    const previousDay = DAY_ORDER[(todayIndex + 6) % DAY_ORDER.length];
    const previous = openingHours.days.find(
      (entry) => entry.day === previousDay,
    );
    const isWithin = (schedule: OpeningDay, fromPreviousDay = false) => {
      if (!schedule.enabled) return false;
      const opensAt = timeToMinutes(schedule.opensAt);
      const closesAt = timeToMinutes(schedule.closesAt);
      if (opensAt === null || closesAt === null) return false;
      const overnight = schedule.closesNextDay || closesAt < opensAt;
      if (fromPreviousDay) return overnight && minuteOfDay < closesAt;
      return overnight
        ? minuteOfDay >= opensAt
        : minuteOfDay >= opensAt && minuteOfDay < closesAt;
    };

    return Boolean(
      (today && isWithin(today)) || (previous && isWithin(previous, true)),
    );
  } catch {
    return false;
  }
};

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

  async feed(query: PostFeedQueryDto = {}) {
    const mode = query.mode || "latest";
    if (mode !== "latest") {
      if (query.latitude === undefined || query.longitude === undefined) {
        throw new BadRequestException(
          "Latitude and longitude are required for location-based posts",
        );
      }

      const nearbyRecords = await this.userModel.aggregate<NearbyMerchant>([
        {
          $geoNear: {
            key: "mainLocation",
            near: {
              type: "Point",
              coordinates: [query.longitude, query.latitude],
            },
            distanceField: "distanceMeters",
            maxDistance: NEARBY_RADIUS_METERS,
            spherical: true,
            query: { role: "merchant", shopIsLive: true },
          },
        },
        {
          $project: {
            businessName: 1,
            profilePhotoUrl: 1,
            businessImageUrl: 1,
            activeHoursSetup: 1,
            distanceMeters: 1,
          },
        },
      ]);
      const nearbyMerchants =
        mode === "open_now"
          ? nearbyRecords.filter((merchant) => isOpenAt(merchant))
          : nearbyRecords;
      if (!nearbyMerchants.length) {
        return { data: [], meta: { limit: FEED_LIMIT, total: 0, mode } };
      }

      const merchantById = new Map(
        nearbyMerchants.map((merchant) => [String(merchant._id), merchant]),
      );
      const records = await this.postModel
        .find({
          status: "PUBLISHED",
          merchantId: { $in: nearbyMerchants.map((merchant) => merchant._id) },
        })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(FEED_LIMIT)
        .populate("productIds", "name description price imageUrl isArchived")
        .lean()
        .exec();
      const data = records
        .flatMap((record) => {
          const post = record as unknown as PopulatedPost;
          if (!(post.merchantId instanceof Types.ObjectId)) return [];
          const merchant = merchantById.get(post.merchantId.toHexString());
          if (!merchant) return [];
          return [
            {
              ...this.serialize({ ...post, merchantId: merchant }),
              distanceKm:
                Math.round((merchant.distanceMeters / 1000) * 10) / 10,
            },
          ];
        })
        .sort(
          (a, b) =>
            a.distanceKm - b.distanceKm ||
            new Date(b.publishedAt || b.createdAt || 0).getTime() -
              new Date(a.publishedAt || a.createdAt || 0).getTime(),
        );

      return {
        data,
        meta: { limit: FEED_LIMIT, total: data.length, mode },
      };
    }

    const posts = await this.postModel
      .find({ status: "PUBLISHED" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(FEED_LIMIT)
      .populate("merchantId", "businessName profilePhotoUrl businessImageUrl")
      .populate("productIds", "name description price imageUrl isArchived")
      .lean()
      .exec();

    return {
      data: posts.map((post) => this.serialize(post)),
      meta: { limit: FEED_LIMIT, total: posts.length, mode },
    };
  }
}
