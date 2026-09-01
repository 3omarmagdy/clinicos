import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class MarketingCampaignFiltersDto {
  @IsOptional() @IsArray() @ArrayUnique() @ArrayMaxSize(1000) @IsString({ each: true }) patientIds?: string[];
  @IsOptional() @IsString() @MaxLength(120) governorate?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(40) gender?: string;
  @IsOptional() @IsString() @MaxLength(120) leadSource?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(130) minAge?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(130) maxAge?: number;
}

export class CreateMarketingCampaignDto extends MarketingCampaignFiltersDto {
  @IsOptional() @IsString() @MaxLength(80) serviceId?: string;
  @IsString() @MinLength(1) @MaxLength(500) offerText!: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class SendMarketingCampaignDto {
  @IsBoolean() confirm!: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) maxRecipients?: number;
}

/** A deliberately explicit, single-recipient onboarding check. */
export class SendTestReminderDto {
  @IsString() @MinLength(8) @MaxLength(100) appointmentId!: string;
  @IsBoolean() confirm!: boolean;
}

export class UpsertWhatsAppIntegrationDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{6,80}$/) phoneNumberId!: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{6,100}$/) wabaId!: string;
  @IsOptional() @IsString() @MinLength(20) @MaxLength(4096) accessToken?: string;
  @IsOptional() @IsString() @Matches(/^v\d+\.\d+$/) apiVersion?: string;
  @IsString() @Matches(/^[A-Za-z0-9_]{1,100}$/) appointmentTemplate!: string;
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_]{1,100}$/) marketingTemplate?: string;
  @IsOptional() @IsString() @Matches(/^[a-z]{2}([_-][A-Z]{2})?$/) templateLanguage?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

/** Meta returns this one-time code after Embedded Signup. It is exchanged on
 * the server, so no Meta app secret or clinic access token reaches the browser. */
export class CompleteEmbeddedWhatsAppSignupDto {
  @IsString() @MinLength(8) @MaxLength(8192) code!: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{6,80}$/) phoneNumberId!: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{6,100}$/) wabaId!: string;
  @IsOptional() @IsString() @Matches(/^v\d+\.\d+$/) apiVersion?: string;
  @IsString() @Matches(/^[A-Za-z0-9_]{1,100}$/) appointmentTemplate!: string;
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_]{1,100}$/) marketingTemplate?: string;
  @IsOptional() @IsString() @Matches(/^[a-z]{2}([_-][A-Z]{2})?$/) templateLanguage?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}
