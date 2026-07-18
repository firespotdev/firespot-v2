import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "../schemas/user.schema";
import { normalizeNigerianPhone } from "../common/phone";

@Injectable()
export class AccountLinkingService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Resolves the Firespot account for a phone number, creating a placeholder
   * account if the person has never signed up. The real owner claims it on
   * their first OTP login (requestOtp finds users by phoneNumber).
   *
   * Never overwrites an existing user's details — the phone number is the
   * identifier, so a differing merchant-supplied name is ignored.
   */
  async resolveOrCreateUserByPhone(
    phone: string,
    countryCode = "+234",
  ): Promise<UserDocument | null> {
    const normalizedPhone = normalizeNigerianPhone(phone, countryCode);
    if (!normalizedPhone) {
      return null;
    }

    const existing = await this.userModel
      .findOne({ phoneNumber: normalizedPhone })
      .exec();
    if (existing) {
      return existing;
    }

    const fullPhoneNumber = `${countryCode}${normalizedPhone}`;
    return this.userModel.create({
      phoneNumber: normalizedPhone,
      phoneCountryCode: countryCode,
      fullPhoneNumber,
      role: "customer",
      onboardingCompleted: false,
      isPlaceholder: true,
      placeholderCreatedAt: new Date(),
    });
  }
}
