import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { customAlphabet } from 'nanoid';
import { QRKit, QRKitDocument } from '../../schemas/qrkit.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { QRCodeService } from '../../services/qr-code.service';
import { CreateQRKitDto } from './dto/create-qrkit.dto';
import { BulkCreateQRKitDto } from './dto/bulk-create-qrkit.dto';

@Injectable()
export class AdminQRKitsService {
  // Custom alphabet for serial numbers: uppercase letters and numbers
  private readonly generateSerialNumber = customAlphabet(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    8,
  );

  constructor(
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private qrCodeService: QRCodeService,
  ) {}

  /**
   * Generate a unique serial number
   * Format: FS-XXXXXXXX (8 alphanumeric characters)
   */
  private async generateUniqueSerialNumber(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const randomPart = this.generateSerialNumber();
      const serialNumber = `FS-${randomPart}`;

      const existing = await this.qrKitModel.findOne({ serialNumber });
      if (!existing) {
        return serialNumber;
      }

      attempts++;
    }

    throw new HttpException(
      'Failed to generate unique serial number after multiple attempts',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * Create a single QRKit
   */
  async createQRKit(): Promise<QRKitDocument> {
    // Generate unique serial number
    const serialNumber = await this.generateUniqueSerialNumber();

    // Generate QR code SVG
    const svgString = await this.qrCodeService.generateQRCodeSVG(serialNumber);

    // Upload SVG to Cloudinary
    const { url, publicId } = await this.qrCodeService.uploadQRCodeSVG(
      svgString,
      serialNumber,
    );

    // Create QRKit record
    const qrKit = new this.qrKitModel({
      serialNumber,
      qrCodeSvgUrl: url,
      qrCodeSvgPublicId: publicId,
      activationStatus: 'pending',
      paymentStatus: 'pending',
      activationAmount: 200000, // NGN 2,000 in kobo
    });

    await qrKit.save();

    return qrKit;
  }

  /**
   * Create multiple QRKits in bulk
   */
  async createBulkQRKits(
    bulkCreateDto: BulkCreateQRKitDto,
  ): Promise<QRKitDocument[]> {
    const { quantity } = bulkCreateDto;

    if (quantity < 1 || quantity > 200) {
      throw new BadRequestException(
        'Quantity must be between 1 and 200',
      );
    }

    const qrKits: QRKitDocument[] = [];

    // Create QRKits sequentially to avoid race conditions
    for (let i = 0; i < quantity; i++) {
      try {
        const qrKit = await this.createQRKit();
        qrKits.push(qrKit);
      } catch (error) {
        // Log error but continue with other QRKits
        console.error(`Failed to create QRKit ${i + 1}:`, error.message);
        throw new HttpException(
          `Failed to create QRKit ${i + 1} of ${quantity}: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    return qrKits;
  }

  /**
   * List all QRKits with filters and pagination
   */
  async listQRKits(
    filters: {
      activationStatus?: string;
      paymentStatus?: string;
      search?: string;
    } = {},
    pagination: { page?: number; limit?: number } = {},
  ) {
    const { activationStatus, paymentStatus, search } = filters;
    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (activationStatus) {
      query.activationStatus = activationStatus;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.serialNumber = { $regex: search.toUpperCase(), $options: 'i' };
    }

    // Execute query with pagination
    const [qrKits, total] = await Promise.all([
      this.qrKitModel
        .find(query)
        .populate('merchantId', 'businessName merchantSlug phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.qrKitModel.countDocuments(query),
    ]);

    return {
      data: qrKits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get QRKit by ID
   */
  async getQRKitById(id: string): Promise<QRKitDocument> {
    const qrKit = await this.qrKitModel
      .findById(id)
      .populate('merchantId', 'businessName merchantSlug phoneNumber bankAccounts')
      .exec();

    if (!qrKit) {
      throw new HttpException('QRKit not found', HttpStatus.NOT_FOUND);
    }

    return qrKit;
  }

  /**
   * Download QR code as PNG
   */
  async downloadQRCode(id: string): Promise<Buffer> {
    const qrKit = await this.qrKitModel.findById(id);

    if (!qrKit) {
      throw new HttpException('QRKit not found', HttpStatus.NOT_FOUND);
    }

    if (!qrKit.qrCodeSvgPublicId) {
      throw new HttpException(
        'QR code not found for this QRKit',
        HttpStatus.NOT_FOUND,
      );
    }

    // Convert SVG to PNG
    const pngBuffer = await this.qrCodeService.getQRCodeAsPNG(
      qrKit.qrCodeSvgPublicId,
    );

    return pngBuffer;
  }
}
