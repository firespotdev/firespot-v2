import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  REPORT_DECISIONS,
  type ReportDecision,
} from "../../reports/report-rules";

export class CreateRefundDto {
  @IsMongoId()
  saleId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountKobo: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  merchantNote?: string;
}

export class RefundDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RetryRefundDto {
  @IsString()
  currency: string;

  @IsString()
  accountNumber: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  bankId: number;
}

export class ResolveDisputeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  refundAmountKobo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  evidenceId?: number;

  @IsOptional()
  @IsString()
  uploadedFilename?: string;
}

export class AddDisputeEvidenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  serviceDetails: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;
}

export class AdminNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  note: string;
}

export class UpdateReportStatusDto {
  @IsEnum(["pending", "in_review", "resolved"])
  status: "pending" | "in_review" | "resolved";

  /** Internal note for the Firespot team; never shown to the customer. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** Who the decision favours; required when resolving. */
  @IsOptional()
  @IsIn(REPORT_DECISIONS)
  decision?: ReportDecision;

  /** What the customer is told when the report is resolved. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolutionNote?: string;
}
