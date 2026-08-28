import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class MarketingCampaignFiltersDto {
  @IsOptional() @IsString() @MaxLength(120) governorate?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(40) gender?: string;
  @IsOptional() @IsString() @MaxLength(120) leadSource?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(130) minAge?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(130) maxAge?: number;
}

export class CreateMarketingCampaignDto extends MarketingCampaignFiltersDto {
  @IsString() @MinLength(1) @MaxLength(500) offerText!: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class SendMarketingCampaignDto {
  @IsBoolean() confirm!: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) maxRecipients?: number;
}

export class UpsertWhatsAppIntegrationDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{6,80}$/) phoneNumberId!: string;
  @IsString() @MinLength(20) @MaxLength(4096) accessToken!: string;
  @IsString() @MinLength(16) @MaxLength(512) appSecret!: string;
  @IsString() @MinLength(16) @MaxLength(256) webhookVerifyToken!: string;
  @IsOptional() @IsString() @Matches(/^v\\d+\\.\\d+$/) apiVersion?: string;
  @IsString() @Matches(/^[A-Za-z0-9_]{1,100}$/) appointmentTemplate!: string;
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_]{1,100}$/) marketingTemplate?: string;
  @IsOptional() @IsString() @Matches(/^[a-z]{2}([_-][A-Z]{2})?$/) templateLanguage?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}
