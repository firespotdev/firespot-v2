import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsString } from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomersService } from "./customers.service";

class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

}

class SetFavoriteDto {
  @IsBoolean()
  isFavorite: boolean;
}

@ApiTags("customers")
@Controller("customers")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new customer for merchant" })
  @ApiResponse({ status: 201, description: "Customer created successfully" })
  async create(@Request() req, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(
      req.user.userId,
      dto.name,
      dto.phoneNumber,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all customers for merchant" })
  @ApiResponse({ status: 200, description: "List of customers" })
  async findAll(@Request() req) {
    return this.customersService.findAll(req.user.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get customer details and history for merchant" })
  @ApiResponse({ status: 200, description: "Customer details" })
  async findOne(@Request() req, @Param("id") id: string) {
    return this.customersService.getCustomerDetails(id, req.user.userId);
  }

  @Patch(":id/favorite")
  @ApiOperation({ summary: "Save or unsave a customer" })
  @ApiResponse({ status: 200, description: "Customer with its saved state" })
  async setFavorite(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: SetFavoriteDto,
  ) {
    return this.customersService.setFavorite(
      req.user.userId,
      id,
      dto.isFavorite,
    );
  }
}
