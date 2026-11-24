import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { claimInviteSms } from "../common/invite-sms-quota";
import { normalizeNigerianPhone } from "../common/phone";
import { MerchantReferralsService } from "../merchant-referrals/merchant-referrals.service";
import { SmsService } from "../services/sms/sms.service";
import { Supplier, SupplierDocument } from "../schemas/supplier.schema";
import { User, UserDocument } from "../schemas/user.schema";
import { SupplierDto } from "./dto/supplier.dto";

const NIGERIAN_MOBILE = /^[789]\d{9}$/;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private smsService: SmsService,
    private merchantReferrals: MerchantReferralsService,
  ) {}

  list(merchantId: string, search?: string) {
    return this.supplierModel
      .find({
        merchantId: new Types.ObjectId(merchantId),
        ...(search ? { name: new RegExp(escapeRegex(search), "i") } : {}),
      })
      .sort({ name: 1 })
      .lean();
  }

  async create(merchantId: string, dto: SupplierDto) {
    const merchant = await this.assertMerchant(merchantId);
    const supplier = new this.supplierModel({
      merchantId: new Types.ObjectId(merchantId),
      name: dto.name,
      phoneNumber: this.toInternational(dto.phoneNumber),
    });
    await supplier.save();
    await this.sendInvite(merchantId, merchant.businessName, supplier);
    return supplier;
  }

  /**
   * Texts a new supplier a link to set up their own Firespot profile, carrying
   * the merchant's referral code. A failed text never undoes the save.
   */
  private async sendInvite(
    merchantId: string,
    businessName: string | undefined,
    supplier: SupplierDocument,
  ) {
    try {
      if (!(await claimInviteSms(this.userModel, merchantId))) {
        this.logger.warn(
          `Merchant ${merchantId} reached today's invite text limit`,
        );
        return;
      }
      const code = await this.merchantReferrals.ensureMerchantCode(merchantId);
      const appUrl = (
        process.env.FRONTEND_URL || "https://lite.firespot.co"
      ).replace(/\/$/, "");
      const link = `${appUrl}/onboarding/merchant/start?mref=${encodeURIComponent(code)}`;
      const from = businessName?.trim() || "A business you supply";
      await this.smsService.sendSms(
        supplier.phoneNumber,
        `${from} saved you as a supplier on Firespot. Continue to your Firespot profile: ${link}`,
      );
    } catch (error) {
      this.logger.error(
        `Could not text supplier ${String(supplier._id)}: ${String(error)}`,
      );
    }
  }

  async update(merchantId: string, supplierId: string, dto: SupplierDto) {
    const supplier = await this.supplierModel.findOne({
      _id: supplierId,
      merchantId: new Types.ObjectId(merchantId),
    });
    if (!supplier) throw new NotFoundException("Supplier not found");
    supplier.name = dto.name;
    supplier.phoneNumber = this.toInternational(dto.phoneNumber);
    await supplier.save();
    return supplier;
  }

  /** Expenses keep the supplier's name and phone they were recorded with. */
  async remove(merchantId: string, supplierId: string) {
    const { deletedCount } = await this.supplierModel.deleteOne({
      _id: supplierId,
      merchantId: new Types.ObjectId(merchantId),
    });
    if (!deletedCount) throw new NotFoundException("Supplier not found");
    return { deleted: true };
  }

  private toInternational(phoneNumber: string) {
    const local = normalizeNigerianPhone(phoneNumber);
    if (!NIGERIAN_MOBILE.test(local)) {
      throw new BadRequestException("Enter a valid Nigerian phone number");
    }
    return `+234${local}`;
  }

  private async assertMerchant(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select("role businessName");
    if (!user) throw new NotFoundException("User not found");
    if (user.role !== "merchant") {
      throw new ForbiddenException("Only businesses can save suppliers");
    }
    return user;
  }
}
