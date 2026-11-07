import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Sale, SaleDocument } from "../schemas/sale.schema";
import { User, UserDocument } from "../schemas/user.schema";
import { Feedback, FeedbackDocument } from "../schemas/feedback.schema";

const RECENT_BUYERS = 2;
// Some recent buyers may have no usable name, so look at a few more.
const RECENT_CANDIDATES = 6;
const MAX_REVIEWS = 20;

/**
 * The public form of a person's own account name: "Deji Salako" → "Deji S.".
 *
 * Only ever pass `User.fullName`. Names stored on sales and feedback can be a
 * phone number (placeholder accounts), a label the merchant typed, or "New
 * customer"; anything that isn't plainly a name returns null so it is never
 * shown on a public page.
 */
export function publicName(name?: string | null): string | null {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const isPlainName = parts.every((part) => /^[\p{L}'’.-]+$/u.test(part));
  if (parts.length === 0 || !isPlainName) return null;

  const capitalize = (word: string) =>
    word.charAt(0).toUpperCase() + word.slice(1);
  const first = capitalize(parts[0]);
  if (parts.length === 1) return first;
  return `${first} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

interface BuyersFacet {
  total: Array<{ count: number }>;
  recent: Array<{ userId: Types.ObjectId }>;
}

interface ReviewRow {
  _id: Types.ObjectId;
  customerUserId?: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt?: Date;
}

export interface ProductBuyers {
  buyerCount: number;
  recentBuyers: Array<{ name: string; photoUrl: string | null }>;
  reviews: Array<{
    id: string;
    name: string;
    photoUrl: string | null;
    rating: number;
    comment: string;
    createdAt?: Date;
  }>;
}

@Injectable()
export class ProductBuyersService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
  ) {}

  /** "Deji S., Michael F. and N others have bought this item". */
  async getBuyers(merchantId: string, productId: string): Promise<ProductBuyers> {
    if (!Types.ObjectId.isValid(merchantId) || !Types.ObjectId.isValid(productId)) {
      throw new BadRequestException("Invalid merchant or product");
    }
    const merchantObjectId = new Types.ObjectId(merchantId);

    const [facet] = await this.saleModel
      .aggregate<BuyersFacet>([
        {
          $match: {
            merchantId: merchantObjectId,
            status: "CONFIRMED",
            "items.productId": productId,
          },
        },
        { $sort: { recordedAt: -1 } },
        // One row per buyer: signed-in customers by account, guests by
        // device. Sales with neither can't be told apart, so aren't counted.
        {
          $group: {
            _id: { $ifNull: ["$customerUserId", "$customerFingerprint"] },
            userId: { $first: "$customerUserId" },
            lastBoughtAt: { $first: "$recordedAt" },
          },
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { lastBoughtAt: -1 } },
        {
          $facet: {
            total: [{ $count: "count" }],
            // Only account holders can be named.
            recent: [
              { $match: { userId: { $ne: null } } },
              { $limit: RECENT_CANDIDATES },
              { $project: { _id: 0, userId: 1 } },
            ],
          },
        },
      ])
      .exec();

    const buyerCount = facet?.total[0]?.count ?? 0;
    if (buyerCount === 0) {
      return { buyerCount: 0, recentBuyers: [], reviews: [] };
    }

    const reviewRows = await this.reviewRows(merchantObjectId, productId);
    const people = await this.namedUsers([
      ...facet.recent.map((buyer) => buyer.userId),
      ...reviewRows.flatMap((row) => row.customerUserId ?? []),
    ]);

    const recentBuyers = facet.recent
      .flatMap((buyer) => people.get(String(buyer.userId)) ?? [])
      .slice(0, RECENT_BUYERS);
    const reviews = reviewRows.map((row) => {
      const person = row.customerUserId
        ? people.get(String(row.customerUserId))
        : undefined;
      return {
        id: String(row._id),
        name: person?.name ?? "Customer",
        photoUrl: person?.photoUrl ?? null,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.createdAt,
      };
    });
    return { buyerCount, recentBuyers, reviews };
  }

  /** Public name and photo per user, for users with a showable name. */
  private async namedUsers(userIds: Types.ObjectId[]) {
    const unique = [...new Map(userIds.map((id) => [String(id), id])).values()];
    const users = unique.length
      ? await this.userModel
          .find({ _id: { $in: unique } })
          .select("fullName profilePhotoUrl")
          .lean()
          .exec()
      : [];

    return new Map(
      users.flatMap((user) => {
        const name = publicName(user.fullName);
        return name
          ? [[String(user._id), { name, photoUrl: user.profilePhotoUrl ?? null }]]
          : [];
      }),
    );
  }

  /** Latest reviews left on confirmed sales that included this product. */
  private reviewRows(merchantId: Types.ObjectId, productId: string) {
    return this.feedbackModel
      .aggregate<ReviewRow>([
        { $match: { merchantId } },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: this.saleModel.collection.name,
            localField: "saleId",
            foreignField: "_id",
            pipeline: [
              {
                $match: { status: "CONFIRMED", "items.productId": productId },
              },
              { $project: { _id: 1 } },
            ],
            as: "sale",
          },
        },
        { $match: { "sale.0": { $exists: true } } },
        { $limit: MAX_REVIEWS },
        {
          $project: {
            customerUserId: 1,
            rating: 1,
            comment: 1,
            createdAt: 1,
          },
        },
      ])
      .exec();
  }
}
