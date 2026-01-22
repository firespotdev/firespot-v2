import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Agent, AgentDocument } from '../schemas/agent.schema'
import { QRKit, QRKitDocument } from '../../schemas/qrkit.schema'
import { CreateAgentDto } from './dto/create-agent.dto'
import { UpdateAgentDto } from './dto/update-agent.dto'
import { AgentQueryDto } from './dto/agent-query.dto'

@Injectable()
export class AdminAgentsService {
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectModel(QRKit.name) private qrKitModel: Model<QRKitDocument>,
  ) {}

  /**
   * Generate unique agent ID (AGT-001, AGT-002, etc.)
   */
  private async generateAgentId(): Promise<string> {
    const lastAgent = await this.agentModel
      .findOne()
      .sort({ agentId: -1 })
      .exec()

    if (!lastAgent) {
      return 'AGT-001'
    }

    const lastNumber = parseInt(lastAgent.agentId.split('-')[1], 10)
    const nextNumber = lastNumber + 1
    return `AGT-${nextNumber.toString().padStart(3, '0')}`
  }

  /**
   * Create a new agent
   */
  async create(createAgentDto: CreateAgentDto): Promise<AgentDocument> {
    const agentId = await this.generateAgentId()

    const agent = new this.agentModel({
      ...createAgentDto,
      agentId,
      status: 'active',
    })

    return agent.save()
  }

  /**
   * List agents with filters and pagination
   */
  async findAll(queryDto: AgentQueryDto) {
    const { status, state, lga, search, page = 1, limit = 50 } = queryDto
    const skip = (page - 1) * limit

    const query: any = {}

    if (status) {
      query.status = status
    }

    if (state) {
      query.state = { $regex: state, $options: 'i' }
    }

    if (lga) {
      query.lga = { $regex: lga, $options: 'i' }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { agentId: { $regex: search.toUpperCase(), $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ]
    }

    const [agents, total] = await Promise.all([
      this.agentModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.agentModel.countDocuments(query),
    ])

    return {
      data: agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get agent by ID with QRKit statistics
   * Returns flattened agent data with qrKitStats at root level
   */
  async findById(id: string) {
    const agent = await this.agentModel.findById(id).exec()

    if (!agent) {
      throw new NotFoundException('Agent not found')
    }

    const qrKitStats = await this.getAgentQRKitStats(id)

    // Return flattened response: spread agent fields with qrKitStats at root level
    return {
      ...agent.toObject(),
      qrKitStats,
    }
  }

  /**
   * Get QRKit statistics for a specific agent
   */
  private async getAgentQRKitStats(agentId: string) {
    const stats = await this.qrKitModel.aggregate([
      { $match: { agentId: new Types.ObjectId(agentId) } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byActivationStatus: [
            {
              $group: {
                _id: '$activationStatus',
                count: { $sum: 1 },
              },
            },
          ],
          byPaymentStatus: [
            {
              $group: {
                _id: '$paymentStatus',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ])

    const result = stats[0]

    const byActivationStatus = {
      pending: 0,
      activated: 0,
      deactivated: 0,
    }

    const byPaymentStatus = {
      pending: 0,
      successful: 0,
      failed: 0,
    }

    result.byActivationStatus.forEach(
      (item: { _id: string; count: number }) => {
        if (item._id === 'pending') {
          byActivationStatus.pending = item.count
        } else if (item._id === 'activated') {
          byActivationStatus.activated = item.count
        } else if (item._id === 'deactivated') {
          byActivationStatus.deactivated = item.count
        }
      },
    )

    result.byPaymentStatus.forEach((item: { _id: string; count: number }) => {
      if (item._id === 'pending') {
        byPaymentStatus.pending = item.count
      } else if (item._id === 'successful') {
        byPaymentStatus.successful = item.count
      } else if (item._id === 'failed') {
        byPaymentStatus.failed = item.count
      }
    })

    return {
      total: result.total[0]?.count || 0,
      byActivationStatus,
      byPaymentStatus,
    }
  }

  /**
   * Get QRKits assigned to an agent
   */
  async getAgentQRKits(
    agentId: string,
    pagination: { page?: number; limit?: number } = {},
  ) {
    const agent = await this.agentModel.findById(agentId).exec()

    if (!agent) {
      throw new NotFoundException('Agent not found')
    }

    const page = pagination.page || 1
    const limit = pagination.limit || 50
    const skip = (page - 1) * limit

    const [qrKits, total] = await Promise.all([
      this.qrKitModel
        .find({ agentId: new Types.ObjectId(agentId) })
        .populate('merchantId', 'businessName merchantSlug phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.qrKitModel.countDocuments({ agentId: new Types.ObjectId(agentId) }),
    ])

    return {
      data: qrKits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Update agent
   */
  async update(
    id: string,
    updateAgentDto: UpdateAgentDto,
  ): Promise<AgentDocument> {
    const agent = await this.agentModel
      .findByIdAndUpdate(id, { $set: updateAgentDto }, { new: true })
      .exec()

    if (!agent) {
      throw new NotFoundException('Agent not found')
    }

    return agent
  }

  /**
   * Soft delete agent (set status to inactive)
   */
  async remove(id: string): Promise<AgentDocument> {
    const agent = await this.agentModel
      .findByIdAndUpdate(id, { $set: { status: 'inactive' } }, { new: true })
      .exec()

    if (!agent) {
      throw new NotFoundException('Agent not found')
    }

    return agent
  }

  /**
   * Get global agent statistics
   */
  async getStats() {
    const stats = await this.agentModel.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            {
              $group: {
                _id: '$status',
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
                _id: '$state',
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1 },
            },
          ],
        },
      },
    ])

    const result = stats[0]

    const byStatus = {
      active: 0,
      inactive: 0,
      suspended: 0,
    }

    result.byStatus.forEach((item: { _id: string; count: number }) => {
      if (item._id === 'active') {
        byStatus.active = item.count
      } else if (item._id === 'inactive') {
        byStatus.inactive = item.count
      } else if (item._id === 'suspended') {
        byStatus.suspended = item.count
      }
    })

    const byState: Record<string, number> = {}
    result.byState.forEach((item: { _id: string; count: number }) => {
      byState[item._id] = item.count
    })

    return {
      total: result.total[0]?.count || 0,
      byStatus,
      byState,
    }
  }

  /**
   * Verify agent exists (for use by other services)
   */
  async verifyAgentExists(agentId: string): Promise<AgentDocument> {
    const agent = await this.agentModel.findById(agentId).exec()

    if (!agent) {
      throw new NotFoundException('Agent not found')
    }

    return agent
  }
}
