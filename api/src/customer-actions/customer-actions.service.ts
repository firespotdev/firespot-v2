import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  getEffectiveTier,
  PLAN_STATE_PROJECTION,
} from "../merchant-plans/constants/plans";
import {
  CustomerCartDraft,
  CustomerCartDraftDocument,
} from "../schemas/customer-cart-draft.schema";
import { Feedback, FeedbackDocument } from "../schemas/feedback.schema";
import { Product, ProductDocument } from "../schemas/product.schema";
import { QRKit, QRKitDocument } from "../schemas/qrkit.schema";
import { Sale, SaleDocument } from "../schemas/sale.schema";
import { User, UserDocument } from "../schemas/user.schema";
import { SaveCartDraftDto } from "./dto/save-cart-draft.dto";

const ACTION_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const LAGOS_UTC_OFFSET_MS = 60 * 60 * 1000;

export interface StoredVariantValue {
  optionId?: string;
  optionName?: string;
  valueId?: string;
  value: string;
}

export interface StoredVariant {
  label?: string;
  values?: StoredVariantValue[];
  size?: string;
  color?: string;
}

interface DraftRecord {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  serialNumber: string;
  items: Array<{
    productId: Types.ObjectId;
    quantity: number;
    selectedVariant?: StoredVariant;
  }>;
  expiresAt: Date;
  updatedAt: Date;
}

interface ProductRecord {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  options?: Array<{
    id: string;
    values: Array<{ id: string; value: string }>;
  }>;
  variantPriceOverrides?: Array<{
    combinationKey: string;
    price: number;
  }>;
  excludedVariantKeys?: string[];
}

interface MerchantRecord {
  _id: Types.ObjectId;
  businessName?: string;
  businessImageUrl?: string;
  profilePhotoUrl?: string;
  businessIndustry?: string;
  planTier?: string;
  planStatus?: string;
  planCurrentPeriodEnd?: Date;
  planGraceUntil?: Date;
  cancelAtPeriodEnd?: boolean;
  pendingPlanChange?: UserDocument["pendingPlanChange"];
}

interface SaleRecord {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  serialNumber: string;
  amount?: number;
  items?: unknown[];
  paymentRail?: string;
  paystackAttemptStatus?: string;
  createdAt: Date;
  recordedAt?: Date;
}

interface QRKitRecord {
  merchantId: Types.ObjectId;
  serialNumber: string;
}

@Injectable()
export class CustomerActionsService {
  constructor(
    @InjectModel(CustomerCartDraft.name)
    private readonly cartDraftModel: Model<CustomerCartDraftDocument>,
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(QRKit.name)
    private readonly qrKitModel: Model<QRKitDocument>,
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private objectId(value: string, label: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${label} is invalid`);
    }
    return new Types.ObjectId(value);
  }

  private sanitizeVariant(
    value?: Record<string, unknown>,
  ): StoredVariant | undefined {
    if (!value) return undefined;
    if (JSON.stringify(value).length > 4_000) {
      throw new BadRequestException("Selected variant is too large");
    }

    const stringValue = (input: unknown) =>
      typeof input === "string" ? input.slice(0, 160) : undefined;
    const rawValues = Array.isArray(value.values)
      ? value.values.slice(0, 10)
      : [];
    const values = rawValues.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      const selectedValue = stringValue(item.value);
      if (!selectedValue) return [];
      return [
        {
          optionId: stringValue(item.optionId),
          optionName: stringValue(item.optionName),
          valueId: stringValue(item.valueId),
          value: selectedValue,
        },
      ];
    });

    return {
      label: stringValue(value.label),
      values: values.length ? values : undefined,
      size: stringValue(value.size),
      color: stringValue(value.color),
    };
  }

  private currentCartItem(
    product: ProductRecord,
    quantity: number,
    selectedVariant?: StoredVariant,
  ) {
    const selectedValueIds = (selectedVariant?.values || [])
      .map((value) => value.valueId)
      .filter((value): value is string => Boolean(value));
    const options = product.options || [];

    if (options.length) {
      if (selectedValueIds.length !== options.length) return null;
      const validSelection = options.every((option, index) =>
        option.values.some((value) => value.id === selectedValueIds[index]),
      );
      if (!validSelection) return null;
    }

    const combinationKey = selectedValueIds.join("|");
    if (
      combinationKey &&
      (product.excludedVariantKeys || []).includes(combinationKey)
    ) {
      return null;
    }
    const override = (product.variantPriceOverrides || []).find(
      (candidate) => candidate.combinationKey === combinationKey,
    );

    return {
      id: `${String(product._id)}-${selectedValueIds.join("-")}`,
      productId: String(product._id),
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      price: override?.price ?? product.price,
      quantity,
      selectedVariant,
    };
  }

  private async serializeDrafts(drafts: DraftRecord[]) {
    if (!drafts.length) return [];

    const productIds = drafts.flatMap((draft) =>
      draft.items.map((item) => item.productId),
    );
    const merchantIds = drafts.map((draft) => draft.merchantId);
    const [productRecords, merchantRecords, activeKits] = await Promise.all([
      this.productModel
        .find({
          _id: { $in: productIds },
          merchantId: { $in: merchantIds },
          isArchived: false,
        })
        .select(
          "merchantId name description price imageUrl options variantPriceOverrides excludedVariantKeys",
        )
        .lean()
        .exec(),
      this.userModel
        .find({ _id: { $in: merchantIds }, shopIsLive: true })
        .select(
          "businessName businessImageUrl profilePhotoUrl businessIndustry",
        )
        .lean()
        .exec(),
      this.qrKitModel
        .find({
          merchantId: { $in: merchantIds },
          activationStatus: "activated",
        })
        .select("merchantId serialNumber")
        .lean()
        .exec(),
    ]);
    const products = productRecords as unknown as ProductRecord[];
    const merchants = merchantRecords as unknown as MerchantRecord[];
    const kits = activeKits as unknown as QRKitRecord[];
    const productById = new Map(
      products.map((product) => [String(product._id), product]),
    );
    const merchantById = new Map(
      merchants.map((merchant) => [String(merchant._id), merchant]),
    );
    const activeSerials = new Set(kits.map((kit) => kit.serialNumber));

    return drafts.flatMap((draft) => {
      const merchant = merchantById.get(String(draft.merchantId));
      if (!merchant || !activeSerials.has(draft.serialNumber)) return [];
      const items = draft.items.flatMap((item) => {
        const product = productById.get(String(item.productId));
        if (
          !product ||
          String(product.merchantId) !== String(draft.merchantId)
        ) {
          return [];
        }
        const current = this.currentCartItem(
          product,
          item.quantity,
          item.selectedVariant,
        );
        return current ? [current] : [];
      });
      if (!items.length) return [];

      return [
        {
          id: String(draft._id),
          merchant: {
            id: String(merchant._id),
            businessName: merchant.businessName || "Merchant",
            businessImageUrl:
              merchant.businessImageUrl || merchant.profilePhotoUrl,
            businessIndustry: merchant.businessIndustry,
          },
          serialNumber: draft.serialNumber,
          items,
          itemCount: items.reduce((total, item) => total + item.quantity, 0),
          total: items.reduce(
            (total, item) => total + item.price * item.quantity,
            0,
          ),
          updatedAt: draft.updatedAt,
          expiresAt: draft.expiresAt,
        },
      ];
    });
  }

  async getCartDraft(customerUserId: string, merchantId: string) {
    const customerId = this.objectId(customerUserId, "Customer");
    const merchantObjectId = this.objectId(merchantId, "Merchant");
    const record = await this.cartDraftModel
      .findOne({
        customerUserId: customerId,
        merchantId: merchantObjectId,
        expiresAt: { $gt: new Date() },
      })
      .lean()
      .exec();
    if (!record) return null;
    const drafts = await this.serializeDrafts([
      record as unknown as DraftRecord,
    ]);
    return drafts[0] || null;
  }

  async saveCartDraft(
    customerUserId: string,
    merchantId: string,
    dto: SaveCartDraftDto,
  ) {
    const customerId = this.objectId(customerUserId, "Customer");
    const merchantObjectId = this.objectId(merchantId, "Merchant");
    const serialNumber = dto.serialNumber.trim().toUpperCase();
    const qrKit = await this.qrKitModel
      .findOne({
        merchantId: merchantObjectId,
        serialNumber,
        activationStatus: "activated",
      })
      .select("_id")
      .lean()
      .exec();
    if (!qrKit) throw new NotFoundException("Merchant checkout is unavailable");

    const productIds = dto.items.map(
      (item) => new Types.ObjectId(item.productId),
    );
    const productRecords = await this.productModel
      .find({
        _id: { $in: productIds },
        merchantId: merchantObjectId,
        isArchived: false,
      })
      .select(
        "merchantId name description price imageUrl options variantPriceOverrides excludedVariantKeys",
      )
      .lean()
      .exec();
    const products = productRecords as unknown as ProductRecord[];
    const productById = new Map(
      products.map((product) => [String(product._id), product]),
    );
    const seenItems = new Set<string>();
    const items = dto.items.map((item) => {
      const product = productById.get(item.productId);
      const selectedVariant = this.sanitizeVariant(item.selectedVariant);
      if (
        !product ||
        !this.currentCartItem(product, item.quantity, selectedVariant)
      ) {
        throw new BadRequestException("One or more cart items are unavailable");
      }
      const variantKey = (selectedVariant?.values || [])
        .map((value) => value.valueId)
        .filter(Boolean)
        .join("|");
      const itemKey = `${item.productId}:${variantKey}`;
      if (seenItems.has(itemKey)) {
        throw new BadRequestException("Cart contains a duplicate item");
      }
      seenItems.add(itemKey);
      return {
        productId: new Types.ObjectId(item.productId),
        quantity: item.quantity,
        selectedVariant,
      };
    });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACTION_WINDOW_MS);

    await this.cartDraftModel.findOneAndUpdate(
      { customerUserId: customerId, merchantId: merchantObjectId },
      { $set: { serialNumber, items, expiresAt } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return this.getCartDraft(customerUserId, merchantId);
  }

  async deleteCartDraft(customerUserId: string, merchantId: string) {
    const customerId = this.objectId(customerUserId, "Customer");
    const merchantObjectId = this.objectId(merchantId, "Merchant");
    await this.cartDraftModel.deleteOne({
      customerUserId: customerId,
      merchantId: merchantObjectId,
    });
    return { success: true };
  }

  async list(customerUserId: string) {
    const customerId = this.objectId(customerUserId, "Customer");
    const now = new Date();
    const feedbackCutoff = new Date(now.getTime() - ACTION_WINDOW_MS);
    const lagosNow = new Date(now.getTime() + LAGOS_UTC_OFFSET_MS);
    const activeSaleCutoff = new Date(
      Date.UTC(
        lagosNow.getUTCFullYear(),
        lagosNow.getUTCMonth(),
        lagosNow.getUTCDate(),
      ) - LAGOS_UTC_OFFSET_MS,
    );
    const [draftRecords, pendingRecords, feedbackSaleRecords] =
      await Promise.all([
        this.cartDraftModel
          .find({ customerUserId: customerId, expiresAt: { $gt: now } })
          .sort({ updatedAt: -1 })
          .limit(20)
          .lean()
          .exec(),
        this.saleModel
          .find({
            customerUserId: customerId,
            status: "PENDING",
            createdAt: { $gte: activeSaleCutoff },
            isArchived: { $ne: true },
            serialNumber: { $exists: true, $ne: "" },
            receiptUrl: { $in: [null, ""] },
            customerMarkedPaidAt: null,
            $or: [
              { paymentRail: { $ne: "paystack" }, isCopied: { $ne: true } },
              {
                paymentRail: "paystack",
                paystackAttemptStatus: { $in: ["failed", "abandoned"] },
              },
            ],
          })
          .sort({ createdAt: -1 })
          .limit(20)
          .select(
            "merchantId serialNumber amount items paymentRail paystackAttemptStatus createdAt",
          )
          .lean()
          .exec(),
        this.saleModel
          .find({
            customerUserId: customerId,
            status: "CONFIRMED",
            isPaidInFull: { $ne: false },
            serialNumber: { $exists: true, $ne: "" },
            $or: [
              { recordedAt: { $gte: feedbackCutoff } },
              {
                recordedAt: { $exists: false },
                createdAt: { $gte: feedbackCutoff },
              },
            ],
          })
          .sort({ recordedAt: -1, createdAt: -1 })
          .limit(50)
          .select("merchantId serialNumber amount recordedAt createdAt")
          .lean()
          .exec(),
      ]);
    const drafts = await this.serializeDrafts(
      draftRecords as unknown as DraftRecord[],
    );
    const pendingSales = pendingRecords as unknown as SaleRecord[];
    const feedbackSales = feedbackSaleRecords as unknown as SaleRecord[];
    const saleIds = feedbackSales.map((sale) => sale._id);
    const feedbackMerchantIds = feedbackSales.map((sale) => sale.merchantId);
    const feedbackSerials = feedbackSales.map((sale) => sale.serialNumber);
    const pendingMerchantIds = pendingSales.map((sale) => sale.merchantId);
    const allMerchantIds = [...feedbackMerchantIds, ...pendingMerchantIds];

    const [submittedSaleIds, eligibleKits, merchantRecords] = await Promise.all(
      [
        this.feedbackModel.distinct("saleId", { saleId: { $in: saleIds } }),
        this.qrKitModel
          .find({
            merchantId: { $in: feedbackMerchantIds },
            serialNumber: { $in: feedbackSerials },
            activationStatus: "activated",
            collectFeedback: true,
          })
          .select("merchantId serialNumber")
          .lean()
          .exec(),
        this.userModel
          .find({ _id: { $in: allMerchantIds } })
          .select(
            `businessName businessImageUrl profilePhotoUrl businessIndustry ${PLAN_STATE_PROJECTION}`,
          )
          .lean()
          .exec(),
      ],
    );
    const submitted = new Set(submittedSaleIds.map(String));
    const kits = eligibleKits as unknown as QRKitRecord[];
    const eligibleKitKeys = new Set(
      kits.map((kit) => `${String(kit.merchantId)}:${kit.serialNumber}`),
    );
    const merchants = merchantRecords as unknown as MerchantRecord[];
    const merchantById = new Map(
      merchants.map((merchant) => [String(merchant._id), merchant]),
    );
    const merchantSummary = (merchantId: Types.ObjectId) => {
      const merchant = merchantById.get(String(merchantId));
      if (!merchant) return null;
      return {
        id: String(merchant._id),
        businessName: merchant.businessName || "Merchant",
        businessImageUrl: merchant.businessImageUrl || merchant.profilePhotoUrl,
        businessIndustry: merchant.businessIndustry,
      };
    };

    const actions = [
      ...pendingSales.flatMap((sale) => {
        const merchant = merchantSummary(sale.merchantId);
        if (!merchant) return [];
        return [
          {
            id: `payment:${String(sale._id)}`,
            type: "complete_payment" as const,
            saleId: String(sale._id),
            serialNumber: sale.serialNumber,
            merchant,
            amount: sale.amount,
            itemCount: sale.items?.length || 0,
            createdAt: sale.createdAt,
            priority: 1,
          },
        ];
      }),
      ...drafts.map((draft) => ({
        id: `draft:${draft.id}`,
        type: "resume_checkout" as const,
        draftId: draft.id,
        serialNumber: draft.serialNumber,
        merchant: draft.merchant,
        amount: draft.total,
        itemCount: draft.itemCount,
        createdAt: draft.updatedAt,
        expiresAt: draft.expiresAt,
        priority: 2,
      })),
      ...feedbackSales.flatMap((sale) => {
        const merchant = merchantById.get(String(sale.merchantId));
        const occurredAt = sale.recordedAt || sale.createdAt;
        const expiresAt = new Date(occurredAt.getTime() + ACTION_WINDOW_MS);
        const kitKey = `${String(sale.merchantId)}:${sale.serialNumber}`;
        if (
          !merchant ||
          submitted.has(String(sale._id)) ||
          !eligibleKitKeys.has(kitKey) ||
          expiresAt <= now ||
          !["PRO", "PROMAX"].includes(getEffectiveTier(merchant) || "")
        ) {
          return [];
        }
        const summary = merchantSummary(sale.merchantId);
        if (!summary) return [];
        return [
          {
            id: `feedback:${String(sale._id)}`,
            type: "leave_feedback" as const,
            saleId: String(sale._id),
            serialNumber: sale.serialNumber,
            merchant: summary,
            amount: sale.amount,
            createdAt: occurredAt,
            expiresAt,
            priority: 3,
          },
        ];
      }),
    ].sort(
      (a, b) =>
        a.priority - b.priority ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return { data: actions };
  }
}
