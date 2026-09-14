import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Store, StoreDocument } from '../schemas/store.schema'

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
  ) {}

  async create(
    merchantId: string,
    dto: { name: string; address?: string; location?: string },
  ): Promise<Store> {
    const store = new this.storeModel({
      merchantId: new Types.ObjectId(merchantId),
      name: dto.name,
      address: dto.address,
      location: dto.location,
      isActive: true,
    })
    return store.save()
  }

  async findAll(merchantId: string): Promise<Store[]> {
    return this.storeModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: 1 })
      .exec()
  }

  async findOne(merchantId: string, id: string): Promise<StoreDocument> {
    const store = await this.storeModel
      .findOne({
        _id: new Types.ObjectId(id),
        merchantId: new Types.ObjectId(merchantId),
      })
      .exec()
    if (!store) {
      throw new NotFoundException('Store not found')
    }
    return store
  }

  async update(
    merchantId: string,
    id: string,
    dto: { name?: string; address?: string; location?: string },
  ): Promise<Store> {
    const store = await this.findOne(merchantId, id)
    if (dto.name !== undefined) store.name = dto.name
    if (dto.address !== undefined) store.address = dto.address
    if (dto.location !== undefined) store.location = dto.location
    return store.save()
  }

  /**
   * Soft-deactivates a store. PRO MAX bills one subscription per active store,
   * so the caller is responsible for disabling the paired subscription.
   */
  async deactivate(merchantId: string, id: string): Promise<Store> {
    const store = await this.findOne(merchantId, id)
    store.isActive = false
    return store.save()
  }

  async countActive(merchantId: string): Promise<number> {
    return this.storeModel
      .countDocuments({
        merchantId: new Types.ObjectId(merchantId),
        isActive: true,
      })
      .exec()
  }
}
