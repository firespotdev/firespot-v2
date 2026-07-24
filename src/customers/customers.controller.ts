import { Controller, Get, Post, Body, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
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
}
