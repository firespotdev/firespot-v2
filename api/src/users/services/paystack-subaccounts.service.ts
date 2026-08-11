import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getEffectiveTier } from "../../merchant-plans/constants/plans";
import { User, UserDocument } from "../../schemas/user.schema";
import { PaystackService } from "./paystack.service";

export const FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE = 0.5;

export type SubaccountProvisioningStatus =
  "ready" | "no_plan" | "no_bank" | "failed";

export interface SubaccountProvisioningResult {
  status: SubaccountProvisioningStatus;
  subaccountCode?: string;
}

/**
 * Owns the lifecycle of merchant Paystack subaccounts. Keeping this in one
 * service prevents plan purchases and bank-account mutations from applying
 * subtly different settlement configuration.
 */
@Injectable()
export class PaystackSubaccountsService {
  private readonly logger = new Logger(PaystackSubaccountsService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private paystackService: PaystackService,
  ) {}

  async ensureForUserId(userId: string): Promise<SubaccountProvisioningResult> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return { status: "no_plan" };
    return this.ensureForUser(user);
  }

  async ensureForUser(
    user: UserDocument,
  ): Promise<SubaccountProvisioningResult> {
    // LITE, PRO and PROMAX are all collection tiers. Grandfathered merchants
    // with no plan remain on the manual rail and should not be provisioned.
    if (!getEffectiveTier(user)) {
      return { status: "no_plan" };
    }

    const primaryBank =
      user.bankAccounts?.find((bank) => bank.isPrimary) ||
      user.bankAccounts?.[0];
    if (!primaryBank) {
      return { status: "no_bank", subaccountCode: user.paystackSubaccountCode };
    }

    const businessName =
      user.businessName ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "Firespot Merchant";

    try {
      if (user.paystackSubaccountCode) {
        const hasDrift =
          user.subaccountBankCode !== primaryBank.bankCode ||
          user.subaccountAccountNumber !== primaryBank.accountNumber ||
          user.subaccountPercentageCharge !==
            FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE;

        if (hasDrift) {
          await this.paystackService.updateSubaccount(
            user.paystackSubaccountCode,
            {
              settlementBank: primaryBank.bankCode,
              accountNumber: primaryBank.accountNumber,
              businessName,
              percentageCharge: FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE,
            },
          );
          user.subaccountBankCode = primaryBank.bankCode;
          user.subaccountAccountNumber = primaryBank.accountNumber;
          user.subaccountPercentageCharge =
            FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE;
          await user.save();
          this.logger.log(
            `Updated Paystack subaccount ${user.paystackSubaccountCode} for ${String(user._id)}`,
          );
        }
      } else {
        const created = await this.paystackService.createSubaccount({
          businessName,
          settlementBank: primaryBank.bankCode,
          accountNumber: primaryBank.accountNumber,
          percentageCharge: FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE,
          description: `Firespot collection subaccount for ${String(user._id)}`,
        });
        user.paystackSubaccountCode = created.subaccountCode;
        user.subaccountBankCode = primaryBank.bankCode;
        user.subaccountAccountNumber = primaryBank.accountNumber;
        user.subaccountPercentageCharge = FIRESPOT_SUBACCOUNT_PERCENTAGE_CHARGE;
        await user.save();
        this.logger.log(
          `Created Paystack subaccount ${created.subaccountCode} for ${String(user._id)}`,
        );
      }

      return {
        status: "ready",
        subaccountCode: user.paystackSubaccountCode,
      };
    } catch (error) {
      this.logger.error(
        `Failed to provision/update Paystack subaccount for ${String(user._id)}: ${String(error)}`,
      );
      return {
        status: "failed",
        subaccountCode: user.paystackSubaccountCode,
      };
    }
  }
}
