import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { StoresService } from './stores.service'

class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsOptional()
  address?: string

  @IsString()
  @IsOptional()
  location?: string
}

class UpdateStoreDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  address?: string

  @IsString()
  @IsOptional()
  location?: string
}

@ApiTags('stores')
@Controller('stores')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @ApiOperation({ summary: 'Create a store (billable location on PRO MAX)' })
  @ApiResponse({ status: 201, description: 'Store created' })
  async create(@Request() req, @Body() dto: CreateStoreDto) {
    return this.storesService.create(req.user.userId, dto)
  }

  @Get()
  @ApiOperation({ summary: "Get the merchant's stores" })
  @ApiResponse({ status: 200, description: 'List of stores' })
  async findAll(@Request() req) {
    return this.storesService.findAll(req.user.userId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a store' })
  @ApiResponse({ status: 200, description: 'Store updated' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.update(req.user.userId, id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a store' })
  @ApiResponse({ status: 200, description: 'Store deactivated' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.storesService.deactivate(req.user.userId, id)
  }
}
