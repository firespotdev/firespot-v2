import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AdminJwtAuthGuard } from "../admin/admin-auth/guards/admin-jwt-auth.guard";
import {
  AdminNoteDto,
  RefundDecisionDto,
  ResolveDisputeDto,
  UpdateReportStatusDto,
} from "./dto/payment-cases.dto";
import { DisputesService } from "./disputes.service";
import { RefundsService } from "./refunds.service";
import { ReportsService } from "../reports/reports.service";

@UseGuards(AdminJwtAuthGuard)
@Controller("admin/payment-cases")
export class AdminPaymentCasesController {
  constructor(
    private readonly refundsService: RefundsService,
    private readonly disputesService: DisputesService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get("refunds")
  refunds(@Query("status") status?: string) {
    return this.refundsService.findAll(status);
  }

  @Post("refunds/:id/approve")
  approveRefund(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: RefundDecisionDto,
  ) {
    return this.refundsService.approve(id, req.user.adminId, dto.reason);
  }

  @Post("refunds/:id/reject")
  rejectRefund(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: RefundDecisionDto,
  ) {
    return this.refundsService.reject(id, req.user.adminId, dto.reason);
  }

  @Get("disputes")
  disputes(@Query("status") status?: string) {
    return this.disputesService.findAll(status);
  }

  @Post("disputes/:id/notes")
  addNote(@Request() req, @Param("id") id: string, @Body() dto: AdminNoteDto) {
    return this.disputesService.addAdminNote(id, req.user.adminId, dto.note);
  }

  @Post("disputes/:id/remind")
  remind(@Request() req, @Param("id") id: string) {
    return this.disputesService.remindMerchant(id, req.user.adminId);
  }

  @Post("disputes/:id/accept")
  accept(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.acceptByAdmin(
      id,
      req.user.adminId,
      dto.message,
    );
  }

  @Get("reports")
  reports(@Query("status") status?: string) {
    return this.reportsService.findAllForAdmin(status);
  }

  @Post("reports/:id/status")
  updateReport(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.reportsService.updateByAdmin(
      id,
      req.user.adminId,
      dto.status,
      dto.note,
    );
  }
}
