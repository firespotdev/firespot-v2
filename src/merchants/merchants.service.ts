import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../schemas/user.schema'

@Injectable()
export class MerchantsService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async getMerchantBySlug(slug: string) {
    const user = await this.userModel
      .findOne({ merchantSlug: slug.toUpperCase() })
      .select('businessName bankAccounts profilePhotoUrl merchantSlug')

    if (!user) {
      throw new HttpException('Merchant not found', HttpStatus.NOT_FOUND)
    }

    if (!user.businessName) {
      throw new HttpException(
        'Merchant has not completed profile setup',
        HttpStatus.BAD_REQUEST,
      )
    }

    const bankAccounts =
      user.bankAccounts && user.bankAccounts.length > 0
        ? user.bankAccounts.map((acc) => ({
            bankName: acc.bankName,
            bankCode: acc.bankCode,
            accountNumber: acc.accountNumber,
            accountName: acc.accountName,
            isPrimary: acc.isPrimary,
          }))
        : []

    return {
      id: user._id,
      merchantSlug: user.merchantSlug,
      businessName: user.businessName,
      bankAccounts,
      profilePhotoUrl: user.profilePhotoUrl,
    }
  }
}
