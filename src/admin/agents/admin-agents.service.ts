import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { customAlphabet } from "nanoid";
import { Agent, AgentDocument } from "../schemas/agent.schema";
import { QRKit, QRKitDocument } from "../../schemas/qrkit.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import { CreateAgentDto } from "./dto/create-agent.dto";
import { UpdateAgentDto } from "./dto/update-agent.dto";
import { AgentQueryDto } from "./dto/agent-query.dto";
import { PaystackService } from "../../users/services/paystack.service";
import { NotificationService } from "../../services/notifications/notification.service";

const nanoidAlphanumeric = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
);

@Injectable()
export class AdminAgentsService {
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private paystackService: PaystackService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Generate unique agent ID (AGT-001, AGT-002, etc.)
   */
  private async generateAgentId(): Promise<string> {
    const lastAgent = await this.agentModel
      .findOne()
      .sort({ agentId: -1 })
      .exec();

    if (!lastAgent) {
      return "AGT-001";
    }

    const lastNumber = parseInt(lastAgent.agentId.split("-")[1], 10);
    const nextNumber = lastNumber + 1;
    return `AGT-${nextNumber.toString().padStart(3, "0")}`;
  }

  /**
   * Create a new agent
   */
  async create(createAgentDto: CreateAgentDto): Promise<AgentDocument> {
    const agentId = await this.generateAgentId();
    const referralCode = nanoidAlphanumeric(8);

    const agent = new this.agentModel({
      ...createAgentDto,
      agentId,
      referralCode,
      status: "active",
    });

    // If bank details are provided, verify and create subaccount
    if (createAgentDto.bankCode && createAgentDto.accountNumber) {
      await this.syncAgentSubaccount(agent, {
        bankCode: createAgentDto.bankCode,
        accountNumber: createAgentDto.accountNumber,
        bankName: createAgentDto.bankName,
        accountName: createAgentDto.accountName,
      });
    }

    const savedAgent = await agent.save();

    // Trigger welcome notification
    this.notificationService
      .sendAgentWelcome(savedAgent)
      .catch((err) =>
        console.error("Failed to trigger welcome notification:", err),
      );

    return savedAgent;
  }

  /**
   * List agents with filters and pagination
   */
  async findAll(queryDto: AgentQueryDto) {
    const { status, state, lga, search, page = 1, limit = 50 } = queryDto;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (state) {
      query.state = { $regex: state, $options: "i" };
    }

    if (lga) {
      query.lga = { $regex: lga, $options: "i" };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { agentId: { $regex: search.toUpperCase(), $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const [agents, total] = await Promise.all([
      this.agentModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.agentModel.countDocuments(query),
    ]);

    return {
      data: agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get agent by ID with QRKit statistics
   * Returns flattened agent data with qrKitStats at root level
   */
  async findById(id: string) {
    const agent = await this.agentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    const qrKitStats = await this.getAgentQRKitStats(id);

    // Return flattened response: spread agent fields with qrKitStats at root level
    return {
      ...agent.toObject(),
      qrKitStats,
    };
  }

  /**
   * Get QRKit statistics for a specific agent
   */
  private async getAgentQRKitStats(agentId: string) {
    const [stats, referralCount] = await Promise.all([
      this.qrKitModel.aggregate([
        { $match: { agentId: new Types.ObjectId(agentId) } },
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
          },
        },
      ]),
      this.userModel.countDocuments({
        referredByAgent: new Types.ObjectId(agentId),
      }),
    ]);

    const result = stats[0];

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

    result.byPaymentStatus.forEach((item: { _id: string; count: number }) => {
      if (item._id === "pending") {
        byPaymentStatus.pending = item.count;
      } else if (item._id === "successful") {
        byPaymentStatus.successful = item.count;
      } else if (item._id === "failed") {
        byPaymentStatus.failed = item.count;
      }
    });

    return {
      total: result.total[0]?.count || 0,
      byActivationStatus,
      byPaymentStatus,
      referralCount,
    };
  }

  /**
   * Get QRKits assigned to an agent
   */
  async getAgentQRKits(
    agentId: string,
    pagination: { page?: number; limit?: number } = {},
  ) {
    const agent = await this.agentModel.findById(agentId).exec();

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [qrKits, total] = await Promise.all([
      this.qrKitModel
        .find({ agentId: new Types.ObjectId(agentId) })
        .populate("merchantId", "businessName merchantSlug phoneNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.qrKitModel.countDocuments({ agentId: new Types.ObjectId(agentId) }),
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
   * Update agent
   */
  async update(
    id: string,
    updateAgentDto: UpdateAgentDto,
  ): Promise<AgentDocument> {
    const agent = await this.agentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    // Check if bank details are being updated
    const isUpdatingBank =
      (updateAgentDto.bankCode && updateAgentDto.bankCode !== agent.bankCode) ||
      (updateAgentDto.accountNumber &&
        updateAgentDto.accountNumber !== agent.accountNumber);

    if (isUpdatingBank) {
      const bankCode = updateAgentDto.bankCode || agent.bankCode;
      const accountNumber = updateAgentDto.accountNumber || agent.accountNumber;

      if (bankCode && accountNumber) {
        await this.syncAgentSubaccount(agent, {
          bankCode,
          accountNumber,
          bankName: updateAgentDto.bankName,
          accountName: updateAgentDto.accountName,
        });
      }
    }

    // Only assign defined values to prevent overwriting existing fields with undefined
    const definedUpdates = Object.fromEntries(
      Object.entries(updateAgentDto).filter(([, value]) => value !== undefined),
    );

    const oldStatus = agent.status;
    const newStatus = updateAgentDto.status;

    Object.assign(agent, definedUpdates);
    const savedAgent = await agent.save();

    // Trigger notifications for status transitions if status was updated
    if (newStatus && newStatus !== oldStatus) {
      if (newStatus === "suspended") {
        this.notificationService
          .sendAgentSuspended(savedAgent)
          .catch((err) =>
            console.error("Failed to trigger suspended notification:", err),
          );
      } else if (newStatus === "active" && oldStatus === "suspended") {
        this.notificationService
          .sendAgentReactivated(savedAgent)
          .catch((err) =>
            console.error("Failed to trigger reactivated notification:", err),
          );
      } else if (newStatus === "inactive") {
        this.notificationService
          .sendAgentDeactivated(savedAgent)
          .catch((err) =>
            console.error("Failed to trigger deactivated notification:", err),
          );
      }
    }

    return savedAgent;
  }

  /**
   * Suspend agent (blocks new assignments, keeps all QR kits)
   */
  async suspend(id: string): Promise<AgentDocument> {
    const agent = await this.agentModel
      .findByIdAndUpdate(id, { $set: { status: "suspended" } }, { new: true })
      .exec();

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    // Trigger suspended notification
    this.notificationService
      .sendAgentSuspended(agent)
      .catch((err) =>
        console.error("Failed to trigger suspended notification:", err),
      );

    return agent;
  }

  /**
   * Deactivate agent (set status to inactive, unassign unactivated QR kits)
   */
  async remove(
    id: string,
  ): Promise<{ agent: AgentDocument; unassignedCount: number }> {
    const agent = await this.agentModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    // Unassign QR kits that haven't been activated yet
    const unassignResult = await this.qrKitModel.updateMany(
      {
        agentId: agent._id,
        activationStatus: { $ne: "activated" },
      },
      {
        $set: { agentId: null },
        $unset: { assignedToAgentAt: "" },
      },
    );

    // Set agent status to inactive
    agent.status = "inactive";
    await agent.save();

    // Trigger deactivated notification
    this.notificationService
      .sendAgentDeactivated(agent)
      .catch((err) =>
        console.error("Failed to trigger deactivated notification:", err),
      );

    return {
      agent,
      unassignedCount: unassignResult.modifiedCount,
    };
  }

  /**
   * Reactivate agent (restore to active status)
   */
  async reactivate(id: string): Promise<AgentDocument> {
    const agent = await this.agentModel
      .findByIdAndUpdate(id, { $set: { status: "active" } }, { new: true })
      .exec();

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    // Trigger reactivated notification
    this.notificationService
      .sendAgentReactivated(agent)
      .catch((err) =>
        console.error("Failed to trigger reactivated notification:", err),
      );

    return agent;
  }

  /**
   * Get global agent statistics
   */
  async getStats() {
    const stats = await this.agentModel.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          byState: [
            {
              $match: { state: { $ne: null } },
            },
            {
              $group: {
                _id: "$state",
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1 },
            },
          ],
        },
      },
    ]);

    const result = stats[0];

    const byStatus = {
      active: 0,
      inactive: 0,
      suspended: 0,
    };

    result.byStatus.forEach((item: { _id: string; count: number }) => {
      if (item._id === "active") {
        byStatus.active = item.count;
      } else if (item._id === "inactive") {
        byStatus.inactive = item.count;
      } else if (item._id === "suspended") {
        byStatus.suspended = item.count;
      }
    });

    const byState: Record<string, number> = {};
    result.byState.forEach((item: { _id: string; count: number }) => {
      byState[item._id] = item.count;
    });

    return {
      total: result.total[0]?.count || 0,
      byStatus,
      byState,
    };
  }

  /**
   * Verify agent exists (for use by other services)
   */
  async verifyAgentExists(agentId: string): Promise<AgentDocument> {
    const agent = await this.agentModel.findById(agentId).exec();

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    return agent;
  }

  /**
   * Sync agent bank details and subaccount with Paystack
   */
  private async syncAgentSubaccount(
    agent: AgentDocument,
    bankDetails: {
      bankCode: string;
      accountNumber: string;
      bankName?: string;
      accountName?: string;
    },
  ) {
    try {
      // 1. Verify bank details or use provided names
      let accountName = bankDetails.accountName || agent.accountName;
      let bankName = bankDetails.bankName || agent.bankName;

      // If we don't have an account name, try to resolve it
      if (!bankDetails.accountName) {
        try {
          const verification = await this.paystackService.verifyBankAccount(
            bankDetails.accountNumber,
            bankDetails.bankCode,
          );
          accountName = verification.accountName;
        } catch (error: any) {
          console.error("Paystack Verification Error:", error.message);

          const isLimitError =
            error.message?.includes("limit") ||
            error.response?.data?.message?.includes("limit");

          if (isLimitError && !accountName) {
            try {
              // Fallback: Use bank name if resolution limit is reached
              const banks = await this.paystackService.getBanks();
              const bank = banks.find(
                (b: any) => b.code === bankDetails.bankCode,
              );
              if (bank) {
                bankName = bank.name;
                accountName = `${bank.name} (Pending Verification)`;
              }
            } catch (bankError) {
              console.error(
                "Failed to fetch banks for fallback name:",
                bankError,
              );
            }
          }

          if (!isLimitError) {
            if (error instanceof HttpException) throw error;
          }
        }
      }

      agent.accountName = accountName || "Verification Pending";
      agent.bankName = bankName;
      agent.accountNumber = bankDetails.accountNumber;
      agent.bankCode = bankDetails.bankCode;

      // 2. Create or Update Subaccount
      try {
        if (!agent.subaccountCode) {
          const subaccount = await this.paystackService.createSubaccount({
            businessName: `${agent.name} (Agent)`,
            settlementBank: bankDetails.bankCode,
            accountNumber: bankDetails.accountNumber,
            percentageCharge: 75, // Firespot takes 75% (1,500 NGN) of the 2,000 NGN fee
            description: `Subaccount for agent ${agent.agentId}`,
          });
          agent.subaccountCode = subaccount.subaccountCode;
        } else {
          await this.paystackService.updateSubaccount(agent.subaccountCode, {
            businessName: `${agent.name} (Agent)`,
            settlementBank: bankDetails.bankCode,
            accountNumber: bankDetails.accountNumber,
            percentageCharge: 75,
          });
        }
      } catch (error) {
        console.error("Paystack Subaccount Sync Error:", error.message);
        // Log error but don't block agent update/creation
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error("Unexpected error during agent subaccount sync:", error);
    }
  }
}
