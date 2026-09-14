import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * All shop-setup fields are optional and independently editable — a merchant
 * fills them in over several sessions, and the checklist counts whichever are
 * present. URLs are stored as plain strings (merchants paste handles, not
 * canonical URLs), so they are not @IsUrl-validated.
 */

class SocialLinksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  facebook?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tiktok?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  x?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: "Enter a valid email address" })
  businessEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ type: SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}

export class UpdateFulfillmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  walkIn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reservations?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  homeService?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  delivery?: boolean;
}

export class UpdateLocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  insideMarket?: boolean;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  branchCount?: number;
}

class EmployeeContactDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(/^\+234\d{10}$/, {
    message: "Employee phone number must be a Nigerian number",
  })
  phoneNumber: string;

  @IsIn(["contacts"])
  source: "contacts";
}

export class UpdateEmployeeSetupDto {
  @IsInt()
  @Min(1)
  @Max(100)
  employeeCount: number;

  @IsArray()
  @ArrayMaxSize(99)
  @ValidateNested({ each: true })
  @Type(() => EmployeeContactDto)
  staff: EmployeeContactDto[];
}

export class UpdateShopPoliciesDto {
  @IsBoolean()
  returns: boolean;

  @IsBoolean()
  exchanges: boolean;

  @IsBoolean()
  cancellations: boolean;

  @IsBoolean()
  refunds: boolean;
}

export const SHOP_DAYS = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;

class DayScheduleDto {
  @IsIn(SHOP_DAYS)
  day: (typeof SHOP_DAYS)[number];

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "Opening time must use HH:mm",
  })
  opensAt?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "Closing time must use HH:mm",
  })
  closesAt?: string;

  @IsBoolean()
  closesNextDay: boolean;
}

class OpeningHoursDto {
  @IsBoolean()
  useDifferentTimes: boolean;

  @IsString()
  @MaxLength(80)
  timezone: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  days: DayScheduleDto[];
}

class BookableHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  days: DayScheduleDto[];
}

class BookingCapacityDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  guestsAtOnce?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  largestGroup?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  customersAtOnce?: number;
}

class BookingDepositDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsIn(["FIXED", "PERCENTAGE"])
  depositType: "FIXED" | "PERCENTAGE";
}

class AppointmentAndReservationDto {
  @IsIn(["SPACE", "APPOINTMENT"])
  bookingType: "SPACE" | "APPOINTMENT";

  @ValidateNested()
  @Type(() => BookableHoursDto)
  bookableHours: BookableHoursDto;

  @ValidateNested()
  @Type(() => BookingCapacityDto)
  capacity: BookingCapacityDto;

  @IsBoolean()
  instantConfirmation: boolean;

  @IsBoolean()
  freeCancellations: boolean;

  @ValidateNested()
  @Type(() => BookingDepositDto)
  deposit: BookingDepositDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeCancellationHours?: number;
}

export class UpdateActiveHoursSetupDto {
  @ValidateNested()
  @Type(() => OpeningHoursDto)
  openingHours: OpeningHoursDto;

  @ValidateNested()
  @Type(() => AppointmentAndReservationDto)
  appointmentAndReservation: AppointmentAndReservationDto;
}
