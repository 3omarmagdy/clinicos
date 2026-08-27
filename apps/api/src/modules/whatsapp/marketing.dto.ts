import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

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
