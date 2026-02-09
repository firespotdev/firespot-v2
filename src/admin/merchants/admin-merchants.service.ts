import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "../../schemas/user.schema";
import { QRKit, QRKitDocument } from "../../schemas/qrkit.schema";

interface MerchantFilters {
  page: number;
  limit: number;
  search?: string;
  status?: "active" | "inactive";
}

@Injectable()
export class AdminMerchantsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
  ) {}

  async getMerchants(filters: MerchantFilters) {
    const { page, limit, search, status } = filters;
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, any> = {};

    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { fullPhoneNumber: { $regex: search, $options: "i" } },
        { merchantSlug: { $regex: search, $options: "i" } },
      ];
    }

    // Get merchants with their activation status
    const merchants = await this.userModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get activated merchant IDs for status filtering
    const activatedMerchantIds = await this.qrKitModel.distinct("merchantId", {
      activationStatus: "activated",
      merchantId: { $ne: null },
    });

    const activatedIdStrings = activatedMerchantIds.map((id) => id.toString());

    // Add isActive flag to each merchant
    let merchantsWithStatus = merchants.map((merchant) => ({
      ...merchant,
      isActive: activatedIdStrings.includes(merchant._id.toString()),
    }));

    // Filter by status if provided
    if (status === "active") {
      merchantsWithStatus = merchantsWithStatus.filter((m) => m.isActive);
    } else if (status === "inactive") {
      merchantsWithStatus = merchantsWithStatus.filter((m) => !m.isActive);
    }

    // Get total count
    const total = await this.userModel.countDocuments(query);

    return {
      data: merchantsWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMerchantById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Invalid merchant ID");
    }

    const merchant = await this.userModel.findById(id).lean();

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    // Get QR kits for this merchant
    const qrKits = await this.qrKitModel
      .find({ merchantId: merchant._id })
      .sort({ createdAt: -1 })
      .lean();

    // Check if merchant has any activated QR kit
    const isActive = qrKits.some((kit) => kit.activationStatus === "activated");

    return {
      ...merchant,
      isActive,
      qrKits,
      qrKitCount: qrKits.length,
      activatedQrKitCount: qrKits.filter(
        (kit) => kit.activationStatus === "activated",
      ).length,
    };
  }

  async getStats() {
    const now = new Date();

    // Start of today (midnight)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Start of this week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all counts in parallel
    const [
      totalMerchants,
      newToday,
      newThisWeek,
      newThisMonth,
      activatedQRKits,
    ] = await Promise.all([
      // Total merchants
      this.userModel.countDocuments(),

      // New merchants today
      this.userModel.countDocuments({
        createdAt: { $gte: startOfToday },
      }),

      // New merchants this week
      this.userModel.countDocuments({
        createdAt: { $gte: startOfWeek },
      }),

      // New merchants this month
      this.userModel.countDocuments({
        createdAt: { $gte: startOfMonth },
      }),

      // Get distinct merchant IDs with activated QR kits
      this.qrKitModel.distinct("merchantId", {
        activationStatus: "activated",
        merchantId: { $ne: null },
      }),
    ]);

    const activeMerchants = activatedQRKits.length;
    const inactiveMerchants = totalMerchants - activeMerchants;

    return {
      total: totalMerchants,
      newToday,
      newThisWeek,
      newThisMonth,
      active: activeMerchants,
      inactive: inactiveMerchants,
      activationRate:
        totalMerchants > 0
          ? Math.round((activeMerchants / totalMerchants) * 100)
          : 0,
    };
  }
}
