import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger'
import { AdminAgentsService } from './admin-agents.service'
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard'
import { CreateAgentDto } from './dto/create-agent.dto'
import { UpdateAgentDto } from './dto/update-agent.dto'
import { AgentQueryDto } from './dto/agent-query.dto'

@ApiTags('admin-agents')
@Controller('admin/agents')
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth('admin-jwt')
export class AdminAgentsController {
  constructor(private readonly adminAgentsService: AdminAgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new agent' })
  @ApiResponse({
    status: 201,
    description: 'Agent created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createAgentDto: CreateAgentDto) {
    return this.adminAgentsService.create(createAgentDto)
  }

  @Get()
  @ApiOperation({ summary: 'List all agents with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Agents retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() queryDto: AgentQueryDto) {
    return this.adminAgentsService.findAll(queryDto)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get global agent statistics' })
  @ApiResponse({
    status: 200,
    description: 'Agent statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 25 },
        byStatus: {
          type: 'object',
          properties: {
            active: { type: 'number', example: 20 },
            inactive: { type: 'number', example: 3 },
            suspended: { type: 'number', example: 2 },
          },
        },
        byState: {
          type: 'object',
          additionalProperties: { type: 'number' },
          example: {
            'Ogun': 10,
            'Lagos': 8,
            'Abuja': 7,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats() {
    return this.adminAgentsService.getStats()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent details by ID with QRKit statistics' })
  @ApiParam({ name: 'id', description: 'Agent ID (MongoDB ObjectId)' })
  @ApiResponse({
    status: 200,
    description: 'Agent retrieved successfully with QRKit stats',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findById(@Param('id') id: string) {
    return this.adminAgentsService.findById(id)
  }

  @Get(':id/qr-kits')
  @ApiOperation({ summary: 'Get QRKits assigned to an agent' })
  @ApiParam({ name: 'id', description: 'Agent ID (MongoDB ObjectId)' })
  @ApiResponse({
    status: 200,
    description: 'QRKits retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAgentQRKits(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminAgentsService.getAgentQRKits(id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update agent details' })
  @ApiParam({ name: 'id', description: 'Agent ID (MongoDB ObjectId)' })
  @ApiResponse({
    status: 200,
    description: 'Agent updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.adminAgentsService.update(id, updateAgentDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete agent (set status to inactive)' })
  @ApiParam({ name: 'id', description: 'Agent ID (MongoDB ObjectId)' })
  @ApiResponse({
    status: 200,
    description: 'Agent deactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    return this.adminAgentsService.remove(id)
  }
}
