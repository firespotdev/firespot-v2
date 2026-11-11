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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SpotsService } from './spots.service'

/** Address fields shared by creating and editing a spot. */
class SpotAddressDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string

  @IsString()
  @IsOptional()
  @MaxLength(200)
  additionalDetails?: string

  @IsBoolean()
  @IsOptional()
  insideMarket?: boolean

  @IsString()
  @IsOptional()
  @MaxLength(150)
  market?: string

  @IsString()
  @IsOptional()
  @MaxLength(200)
  shoppingComplex?: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  shopNumber?: string

  @IsString()
  @IsOptional()
  @MaxLength(300)
  landmark?: string

  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string
}

class CreateSpotDto extends SpotAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string

  @IsUUID()
  idempotencyKey: string
}

class UpdateSpotDto extends SpotAddressDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string

  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string

  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string
}

@ApiTags('spots')
@Controller('spots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a spot (billable location on PRO MAX)' })
  @ApiResponse({ status: 201, description: 'Spot created' })
  async create(@Request() req, @Body() dto: CreateSpotDto) {
    return this.spotsService.create(req.user.userId, dto)
  }

  @Get()
  @ApiOperation({ summary: "Get the merchant's spots" })
  @ApiResponse({ status: 200, description: 'List of spots' })
  async findAll(@Request() req) {
    return this.spotsService.findAll(req.user.userId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a spot' })
  @ApiResponse({ status: 200, description: 'Spot updated' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateSpotDto,
  ) {
    return this.spotsService.update(req.user.userId, id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a spot' })
  @ApiResponse({ status: 200, description: 'Spot deactivated' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.spotsService.deactivate(req.user.userId, id)
  }
}
