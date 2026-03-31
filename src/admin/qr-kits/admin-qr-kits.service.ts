import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { customAlphabet } from "nanoid";
import { QRKit, QRKitDocument } from "../../schemas/qrkit.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import { Agent, AgentDocument } from "../schemas/agent.schema";
import { QRCodeService } from "../../services/qr-code.service";
import { CreateQRKitDto } from "./dto/create-qrkit.dto";
import { BulkCreateQRKitDto } from "./dto/bulk-create-qrkit.dto";
import {
  AssignQRKitsDto,
  ReassignQRKitsDto,
  UnassignQRKitsDto,
} from "./dto/assign-qrkits.dto";

@Injectable()
export class AdminQRKitsService {
  private readonly generateSerialNumber = customAlphabet(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    8,
  );

  constructor(
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
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
      "Failed to generate unique serial number after multiple attempts",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * Create a single QRKit
   */
  async createQRKit(agentId?: string): Promise<QRKitDocument> {
    // Verify agent exists and is active if provided
    if (agentId) {
      const agent = await this.agentModel.findById(agentId);
      if (!agent) {
        throw new NotFoundException("Agent not found");
      }
      if (agent.status !== "active") {
        throw new BadRequestException(
          `Cannot assign QR kit to ${agent.status} agent. Agent must be active.`,
        );
      }
    }

    const serialNumber = await this.generateUniqueSerialNumber();

    const svgString = await this.qrCodeService.generateQRCodeSVG(serialNumber);

    const { url, publicId } = await this.qrCodeService.uploadQRCodeSVG(
      svgString,
      serialNumber,
    );

    // Create QRKit record
    const qrKitData: any = {
      serialNumber,
      qrCodeSvgUrl: url,
      qrCodeSvgPublicId: publicId,
      activationStatus: "pending",
      paymentStatus: "pending",
      activationAmount: 200000, // NGN 2,000 in kobo
      ...(agentId && {
        agentId: new Types.ObjectId(agentId),
        assignedToAgentAt: new Date(),
      }),
    };

    const qrKit = new this.qrKitModel(qrKitData);

    await qrKit.save();

    return qrKit;
  }

  /**
   * Create multiple QRKits in bulk
   */
  async createBulkQRKits(
    bulkCreateDto: BulkCreateQRKitDto,
  ): Promise<QRKitDocument[]> {
    const { quantity, agentId } = bulkCreateDto;

    if (quantity < 1 || quantity > 200) {
      throw new BadRequestException("Quantity must be between 1 and 200");
    }

    // Verify agent exists and is active if provided
    if (agentId) {
      const agent = await this.agentModel.findById(agentId);
      if (!agent) {
        throw new NotFoundException("Agent not found");
      }
      if (agent.status !== "active") {
        throw new BadRequestException(
          `Cannot assign QR kits to ${agent.status} agent. Agent must be active.`,
        );
      }
    }

    const qrKits: QRKitDocument[] = [];

    for (let i = 0; i < quantity; i++) {
      try {
        const qrKit = await this.createQRKit(agentId);
        qrKits.push(qrKit);
      } catch (error) {
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
      agentId?: string;
      unassigned?: boolean;
      isDigital?: boolean;
    } = {},
    pagination: { page?: number; limit?: number } = {},
  ) {
    const { activationStatus, paymentStatus, search, agentId, unassigned, isDigital } =
      filters;
    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (activationStatus) {
      query.activationStatus = activationStatus;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.serialNumber = { $regex: search.toUpperCase(), $options: "i" };
    }

    if (agentId) {
      query.agentId = new Types.ObjectId(agentId);
    }

    if (unassigned) {
      query.agentId = null;
    }

    if (isDigital !== undefined) {
      query.isDigital = isDigital;
    }

    // Execute query with pagination
    const [qrKits, total] = await Promise.all([
      this.qrKitModel
        .find(query)
        .populate("merchantId", "businessName merchantSlug phoneNumber")
        .populate("agentId", "agentId name phoneNumber state lga bustop")
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
      .populate(
        "merchantId",
        "businessName merchantSlug phoneNumber bankAccounts",
      )
      .exec();

    if (!qrKit) {
      throw new HttpException("QRKit not found", HttpStatus.NOT_FOUND);
    }

    return qrKit;
  }

  /**
   * Download QR code as PNG
   */
  async downloadQRCode(id: string): Promise<Buffer> {
    const qrKit = await this.qrKitModel.findById(id);

    if (!qrKit) {
      throw new HttpException("QRKit not found", HttpStatus.NOT_FOUND);
    }

    if (!qrKit.qrCodeSvgPublicId) {
      throw new HttpException(
        "QR code not found for this QRKit",
        HttpStatus.NOT_FOUND,
      );
    }

    // Convert SVG to PNG
    const pngBuffer = await this.qrCodeService.getQRCodeAsPNG(
      qrKit.qrCodeSvgPublicId,
    );

    return pngBuffer;
  }

  /**
   * Get QRKit statistics
   * Uses MongoDB aggregation for efficient calculation
   */
  async getStats() {
    const stats = await this.qrKitModel.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          byActivationStatus: [
            {
              $group: {
                _id: "$activationStatus",
                count: { $sum: 1 },
              },
            },
          ],
          byPaymentStatus: [
            {
              $group: {
                _id: "$paymentStatus",
                count: { $sum: 1 },
              },
            },
          ],
          byType: [
            {
              $group: {
                _id: "$isDigital",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];

    // Transform aggregation results into the expected format
    const byActivationStatus = {
      pending: 0,
      activated: 0,
      deactivated: 0,
    };

    const byPaymentStatus = {
      pending: 0,
      successful: 0,
      failed: 0,
    };

    const byType = {
      digital: 0,
      physical: 0,
    };

    // Map activation status counts
    result.byActivationStatus.forEach(
      (item: { _id: string; count: number }) => {
        if (item._id === "pending") {
          byActivationStatus.pending = item.count;
        } else if (item._id === "activated") {
          byActivationStatus.activated = item.count;
        } else if (item._id === "deactivated") {
          byActivationStatus.deactivated = item.count;
        }
      },
    );

    // Map payment status counts
    result.byPaymentStatus.forEach((item: { _id: string; count: number }) => {
      if (item._id === "pending") {
        byPaymentStatus.pending = item.count;
      } else if (item._id === "successful") {
        byPaymentStatus.successful = item.count;
      } else if (item._id === "failed") {
        byPaymentStatus.failed = item.count;
      }
    });

    // Map type counts
    result.byType.forEach((item: { _id: boolean; count: number }) => {
      if (item._id === true) {
        byType.digital = item.count;
      } else {
        byType.physical = item.count;
      }
    });

    return {
      total: result.total[0]?.count || 0,
      byActivationStatus,
      byPaymentStatus,
      byType,
    };
  }

  /**
   * Assign QRKits to an agent
   */
  async assignToAgent(dto: AssignQRKitsDto) {
    const agent = await this.agentModel.findById(dto.agentId);
    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    // Only allow assignment to active agents
    if (agent.status !== "active") {
      throw new BadRequestException(
        `Cannot assign QR kits to ${agent.status} agent. Agent must be active.`,
      );
    }

    const result = await this.qrKitModel.updateMany(
      {
        _id: { $in: dto.qrKitIds.map((id) => new Types.ObjectId(id)) },
        agentId: null, // Only assign unassigned kits
      },
      {
        $set: {
          agentId: new Types.ObjectId(dto.agentId),
          assignedToAgentAt: new Date(),
        },
      },
    );

    return {
      assigned: result.modifiedCount,
      requested: dto.qrKitIds.length,
      message: `${result.modifiedCount} of ${dto.qrKitIds.length} QRKits assigned to agent ${agent.agentId}`,
    };
  }

  /**
   * Reassign QRKits between agents
   */
  async reassignAgent(dto: ReassignQRKitsDto) {
    const [fromAgent, toAgent] = await Promise.all([
      this.agentModel.findById(dto.fromAgentId),
      this.agentModel.findById(dto.toAgentId),
    ]);

    if (!fromAgent) {
      throw new NotFoundException("Source agent not found");
    }
    if (!toAgent) {
      throw new NotFoundException("Target agent not found");
    }

    // Only allow reassignment to active agents
    if (toAgent.status !== "active") {
      throw new BadRequestException(
        `Cannot reassign QR kits to ${toAgent.status} agent. Target agent must be active.`,
      );
    }

    const result = await this.qrKitModel.updateMany(
      {
        _id: { $in: dto.qrKitIds.map((id) => new Types.ObjectId(id)) },
        agentId: new Types.ObjectId(dto.fromAgentId),
      },
      {
        $set: {
          agentId: new Types.ObjectId(dto.toAgentId),
          assignedToAgentAt: new Date(),
        },
      },
    );

    return {
      reassigned: result.modifiedCount,
      requested: dto.qrKitIds.length,
      message: `${result.modifiedCount} of ${dto.qrKitIds.length} QRKits transferred from ${fromAgent.agentId} to ${toAgent.agentId}`,
    };
  }

  /**
   * Unassign QRKits from agents
   */
  async unassignFromAgent(dto: UnassignQRKitsDto) {
    const result = await this.qrKitModel.updateMany(
      {
        _id: { $in: dto.qrKitIds.map((id) => new Types.ObjectId(id)) },
        agentId: { $ne: null },
      },
      {
        $set: {
          agentId: null,
          assignedToAgentAt: null,
        },
      },
    );

    return {
      unassigned: result.modifiedCount,
      requested: dto.qrKitIds.length,
      message: `${result.modifiedCount} of ${dto.qrKitIds.length} QRKits unassigned`,
    };
  }

  /**
   * Delete a QRKit (only if not activated)
   */
  async deleteQRKit(id: string): Promise<{ message: string }> {
    const qrKit = await this.qrKitModel.findById(id);

    if (!qrKit) {
      throw new NotFoundException("QRKit not found");
    }

    if (qrKit.activationStatus === "activated") {
      throw new BadRequestException(
        "Cannot delete an activated QR kit. Only pending or deactivated kits can be deleted.",
      );
    }

    // Delete the QR code from Cloudinary if it exists
    if (qrKit.qrCodeSvgPublicId) {
      try {
        await this.qrCodeService.deleteQRCode(qrKit.qrCodeSvgPublicId);
      } catch (error) {
        // Log but don't fail if Cloudinary deletion fails
        console.error("Failed to delete QR code from Cloudinary:", error);
      }
    }

    await this.qrKitModel.deleteOne({ _id: id });

    return {
      message: `QRKit ${qrKit.serialNumber} deleted successfully`,
    };
  }
}
