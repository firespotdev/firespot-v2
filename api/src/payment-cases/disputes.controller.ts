import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  AddDisputeEvidenceDto,
  ResolveDisputeDto,
} from "./dto/payment-cases.dto";
import { DisputesService } from "./disputes.service";

@ApiTags("paystack-disputes")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("paystack-disputes")
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  findAll(@Request() req) {
    return this.disputesService.findMerchantDisputes(req.user.userId);
  }

  @Post(":id/evidence")
  @UseInterceptors(
    FileInterceptor("evidence", { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  addEvidence(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: AddDisputeEvidenceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.disputesService.addEvidence(req.user.userId, id, dto, file);
  }

  @Post(":id/accept")
  accept(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.acceptByMerchant(req.user.userId, id, dto);
  }

  @Post(":id/decline")
  decline(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.declineByMerchant(req.user.userId, id, dto);
  }
}
