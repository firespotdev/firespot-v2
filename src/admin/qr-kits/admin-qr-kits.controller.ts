import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import type { Response } from "express";
import { AdminQRKitsService } from "./admin-qr-kits.service";
import { AdminJwtAuthGuard } from "../admin-auth/guards/admin-jwt-auth.guard";
import { CreateQRKitDto } from "./dto/create-qrkit.dto";
import { BulkCreateQRKitDto } from "./dto/bulk-create-qrkit.dto";
import {
  AssignQRKitsDto,
  ReassignQRKitsDto,
  UnassignQRKitsDto,
} from "./dto/assign-qrkits.dto";

@ApiTags("admin-qr-kits")
@Controller("admin/qr-kits")
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth("admin-jwt")
export class AdminQRKitsController {
  constructor(private readonly adminQRKitsService: AdminQRKitsService) {}

  @Post()
  @ApiOperation({ summary: "Create a single QRKit" })
  @ApiResponse({
    status: 201,
    description: "QRKit created successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid agent ID" })
  @ApiResponse({ status: 404, description: "Agent not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createQRKit(@Body() createDto: CreateQRKitDto) {
    return this.adminQRKitsService.createQRKit(createDto.agentId);
  }

  @Post("bulk")
  @ApiOperation({ summary: "Create multiple QRKits in bulk (1-200)" })
  @ApiResponse({
    status: 201,
    description: "QRKits created successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid quantity" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createBulkQRKits(@Body() bulkCreateDto: BulkCreateQRKitDto) {
    return this.adminQRKitsService.createBulkQRKits(bulkCreateDto);
  }

  @Get()
  @ApiOperation({ summary: "List all QRKits with filters and pagination" })
  @ApiQuery({
    name: "status",
    required: false,
    description:
      "Filter by activation status (pending, activated, deactivated)",
  })
  @ApiQuery({
    name: "paymentStatus",
    required: false,
    description: "Filter by payment status (pending, successful, failed)",
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search by serial number",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 50 })
  @ApiQuery({
    name: "agentId",
    required: false,
    description: "Filter by agent ID (MongoDB ObjectId)",
  })
  @ApiQuery({
    name: "unassigned",
    required: false,
    type: Boolean,
    description: "Filter only unassigned QRKits",
  })
  @ApiResponse({
    status: 200,
    description: "QRKits retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async listQRKits(
    @Query("status") status?: string,
    @Query("paymentStatus") paymentStatus?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("agentId") agentId?: string,
    @Query("unassigned") unassigned?: string,
  ) {
    return this.adminQRKitsService.listQRKits(
      {
        activationStatus: status,
        paymentStatus,
        search,
        agentId,
        unassigned: unassigned === "true",
      },
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
    );
  }

  @Get("stats")
  @ApiOperation({ summary: "Get QRKit statistics" })
  @ApiResponse({
    status: 200,
    description: "QRKit statistics retrieved successfully",
    schema: {
      type: "object",
      properties: {
        total: { type: "number", example: 150 },
        byActivationStatus: {
          type: "object",
          properties: {
            pending: { type: "number", example: 50 },
            activated: { type: "number", example: 80 },
            deactivated: { type: "number", example: 20 },
          },
        },
        byPaymentStatus: {
          type: "object",
          properties: {
            pending: { type: "number", example: 30 },
            successful: { type: "number", example: 100 },
            failed: { type: "number", example: 20 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getStats() {
    return this.adminQRKitsService.getStats();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get QRKit details by ID" })
  @ApiParam({ name: "id", description: "QRKit ID" })
  @ApiResponse({
    status: 200,
    description: "QRKit retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "QRKit not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getQRKitById(@Param("id") id: string) {
    return this.adminQRKitsService.getQRKitById(id);
  }

  @Get(":id/qr-code")
  @ApiOperation({ summary: "Download QR code as PNG (1000x1000px)" })
  @ApiParam({ name: "id", description: "QRKit ID" })
  @ApiResponse({
    status: 200,
    description: "QR code PNG file",
    content: {
      "image/png": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "QRKit or QR code not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async downloadQRCode(@Param("id") id: string, @Res() res: Response) {
    const pngBuffer = await this.adminQRKitsService.downloadQRCode(id);

    const qrKit = await this.adminQRKitsService.getQRKitById(id);

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${qrKit.serialNumber}.png"`,
      "Content-Length": pngBuffer.length.toString(),
    });

    res.status(HttpStatus.OK).send(pngBuffer);
  }

  @Post("assign")
  @ApiOperation({ summary: "Assign unassigned QRKits to an agent" })
  @ApiResponse({
    status: 200,
    description: "QRKits assigned successfully",
    schema: {
      type: "object",
      properties: {
        assigned: { type: "number", example: 10 },
        requested: { type: "number", example: 10 },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Agent not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async assignToAgent(@Body() dto: AssignQRKitsDto) {
    return this.adminQRKitsService.assignToAgent(dto);
  }

  @Post("reassign")
  @ApiOperation({ summary: "Transfer QRKits from one agent to another" })
  @ApiResponse({
    status: 200,
    description: "QRKits reassigned successfully",
    schema: {
      type: "object",
      properties: {
        reassigned: { type: "number", example: 10 },
        requested: { type: "number", example: 10 },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Agent not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async reassignAgent(@Body() dto: ReassignQRKitsDto) {
    return this.adminQRKitsService.reassignAgent(dto);
  }

  @Post("unassign")
  @ApiOperation({ summary: "Remove agent assignment from QRKits" })
  @ApiResponse({
    status: 200,
    description: "QRKits unassigned successfully",
    schema: {
      type: "object",
      properties: {
        unassigned: { type: "number", example: 10 },
        requested: { type: "number", example: 10 },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async unassignFromAgent(@Body() dto: UnassignQRKitsDto) {
    return this.adminQRKitsService.unassignFromAgent(dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a QRKit (only if not activated)" })
  @ApiParam({ name: "id", description: "QRKit ID" })
  @ApiResponse({
    status: 200,
    description: "QRKit deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Cannot delete activated QRKit" })
  @ApiResponse({ status: 404, description: "QRKit not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async deleteQRKit(@Param("id") id: string) {
    return this.adminQRKitsService.deleteQRKit(id);
  }
}
