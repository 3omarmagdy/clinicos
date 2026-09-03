import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class WhatsAppAudienceDto {
  @IsOptional() @IsIn(['all', 'normal', 'regular', 'vip', 'new']) customerType?: string;
  @IsOptional() @IsIn(['male', 'female']) gender?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(130) minAge?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(130) maxAge?: number;
  @IsOptional() @IsIn(['any', '7d', '30d', '3m', '6m', 'over_6m']) lastVisit?: string;
  @IsOptional() @IsIn(['any', 'upcoming', 'none_upcoming', 'missed', 'completed']) appointment?: string;
  @IsOptional() @IsString() @MaxLength(120) serviceId?: string;
  @IsOptional() @IsString() @MaxLength(80) tag?: string;
}

export class UpsertWhatsAppConnectionDto {
  @IsString() @Matches(/^\d+$/) phoneNumberId!: string;
  @IsString() @Matches(/^\d+$/) businessAccountId!: string;
  @IsString() @Min(20) accessToken!: string;
  @IsOptional() @Matches(/^v\d+\.\d+$/) apiVersion?: string;
  @IsOptional() @IsString() @MaxLength(512) appointmentTemplate?: string;
  @IsOptional() @IsString() @MaxLength(512) marketingTemplate?: string;
  @IsOptional() @IsString() @MaxLength(10) templateLanguage?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(168) reminderHoursBefore?: number;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
}

export class CreateCampaignDto {
  @IsString() @MaxLength(140) name!: string;
  @IsString() @Matches(/^[a-z0-9_]+$/) templateName!: string;
  @IsOptional() @IsString() @MaxLength(10) templateLanguage?: string;
  @ValidateNested() @Type(() => WhatsAppAudienceDto) audience!: WhatsAppAudienceDto;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class SendCampaignDto {
  @IsOptional() @IsBoolean() confirm?: boolean;
}
