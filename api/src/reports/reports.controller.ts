import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReportsService } from "./reports.service";
import {
  REPORT_CATEGORY_KEYS,
  REPORT_DESCRIPTION_MAX,
  type ReportCategory,
} from "./report-rules";

interface AuthedRequest {
  user: { userId: string };
}

class CreateReportDto {
  @IsMongoId()
  saleId: string;

  @IsIn(REPORT_CATEGORY_KEYS)
  category: ReportCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(REPORT_DESCRIPTION_MAX)
  description: string;
}

class ListReportsQuery {
  @IsOptional()
  @IsMongoId()
  saleId?: string;
}

@ApiTags("reports")
@Controller("reports")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("proof"))
  @ApiOperation({ summary: "Report an issue with one of your payments" })
  @ApiResponse({ status: 201, description: "Report submitted successfully" })
  async create(
    @Request() req: AuthedRequest,
    @Body() dto: CreateReportDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.reportsService.create(req.user.userId, dto, file?.buffer);
  }

  @Get()
  @ApiOperation({ summary: "Your reports, optionally for one sale" })
  async findAll(
    @Request() req: AuthedRequest,
    @Query() query: ListReportsQuery,
  ) {
    return this.reportsService.findAllByCustomer(req.user.userId, query.saleId);
  }

  @Get("sale/:saleId")
  @ApiOperation({ summary: "A sale as the report screens show it" })
  async saleContext(
    @Request() req: AuthedRequest,
    @Param("saleId") saleId: string,
  ) {
    return this.reportsService.saleContext(req.user.userId, saleId);
  }

  @Get(":id")
  @ApiOperation({ summary: "One of your reports with its progress" })
  async findOne(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.reportsService.findOneForCustomer(id, req.user.userId);
  }

  @Post(":id/follow-up")
  @ApiOperation({ summary: "Nudge Firespot about an open report" })
  async followUp(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.reportsService.followUp(id, req.user.userId);
  }

  @Post(":id/close")
  @ApiOperation({ summary: "Close an open report" })
  async close(@Request() req: AuthedRequest, @Param("id") id: string) {
    return this.reportsService.close(id, req.user.userId);
  }
}
