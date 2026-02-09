import { IsOptional, IsDateString, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum DateRangePreset {
  ALL_TIME = "all_time",
  TODAY = "today",
  THIS_WEEK = "this_week",
  LAST_7_DAYS = "last_7_days",
  LAST_30_DAYS = "last_30_days",
  LAST_90_DAYS = "last_90_days",
  CUSTOM = "custom",
}

export class InsightsQueryDto {
  @ApiProperty({
    enum: DateRangePreset,
    default: DateRangePreset.ALL_TIME,
    required: false,
    description: "Predefined date range preset",
  })
  @IsOptional()
  @IsEnum(DateRangePreset)
  preset?: DateRangePreset;

  @ApiProperty({
    required: false,
    description: "Start date for custom range (ISO 8601 format)",
    example: "2025-01-01",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: "End date for custom range (ISO 8601 format)",
    example: "2025-01-22",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export interface QRKitScanBreakdown {
  qrKitId: string;
  serialNumber: string;
  scanCount: number;
}

export interface BankBreakdown {
  bankName: string;
  count: number;
}

export interface CustomerBreakdown {
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
}

export interface MerchantInsightsResponse {
  traffic: {
    totalCustomers: number;
    customerBreakdown: CustomerBreakdown;
  };
  qrKitScans: {
    totalScans: number;
    breakdown: QRKitScanBreakdown[];
  };
  accountCopies: {
    totalCopies: number;
    bankBreakdown: BankBreakdown[];
  };
  linkedCounts: {
    bankAccounts: number;
    qrKits: number;
  };
  dateRange: {
    startDate: string | null;
    endDate: string | null;
    preset: string;
  };
}
