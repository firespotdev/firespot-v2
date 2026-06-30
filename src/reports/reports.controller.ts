import { Controller, Get, Post, Body, UseGuards, Request, UseInterceptors, UploadedFile } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReportsService } from "./reports.service";

class CreateReportDto {
  saleId: string;
  category: string;
  description: string;
}

@ApiTags("reports")
@Controller("reports")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("proof"))
  @ApiOperation({ summary: "Submit a new transaction report" })
  @ApiResponse({ status: 201, description: "Report submitted successfully" })
  async create(
    @Request() req,
    @Body() dto: CreateReportDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.reportsService.create(
      req.user.userId,
      dto.saleId,
      dto.category,
      dto.description,
      file?.buffer,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all reports submitted by logged-in customer" })
  @ApiResponse({ status: 200, description: "List of reports" })
  async findAll(@Request() req) {
    return this.reportsService.findAllByCustomer(req.user.userId);
  }
}
