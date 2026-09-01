import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const maritalStatusAliases: Record<string, 'single' | 'married' | 'divorced' | 'widowed' | 'other'> = {
  single: 'single',
  married: 'married',
  divorced: 'divorced',
  widowed: 'widowed',
  other: 'other',
  'أعزب': 'single',
  'عزباء': 'single',
  'متزوج': 'married',
  'متزوجة': 'married',
  'مطلق': 'divorced',
  'مطلقة': 'divorced',
  'أرمل': 'widowed',
  'أرملة': 'widowed',
  'اخرى': 'other',
  'أخرى': 'other',
};

function normalizeMaritalStatus(value: unknown) {
  if (typeof value !== 'string') return undefined;
  return maritalStatusAliases[value.trim().toLowerCase()];
}

export class CreatePatientDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(80) lastName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{3,40}$/)
  medicalRecordNumber?: string;

  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsDateString() admittedAt?: string;

  // Temporary compatibility for clients that still submit age.
  // Clinical data is stored as dateOfBirth.
  @IsOptional() @IsInt() @Min(0) @Max(130) age?: number;

  @IsOptional() @IsString() @MaxLength(40) gender?: string;
  @Transform(({ value }) => normalizeMaritalStatus(value), { toClassOnly: true })
  @IsOptional() @IsIn(['single', 'married', 'divorced', 'widowed', 'other']) maritalStatus?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(30) whatsappPhone?: string;
  @IsOptional() @IsBoolean() whatsappOptIn?: boolean;
  @IsOptional() @IsBoolean() whatsappMarketingOptIn?: boolean;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;

  // CRM / Marketing fields
  @IsOptional() @IsString() @MaxLength(120) occupation?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) governorate?: string;
  @IsOptional() @IsString() @MaxLength(120) leadSource?: string;

  @IsOptional() @IsBoolean() marketingConsent?: boolean;

  @IsOptional() @IsDateString() marketingConsentAt?: string;

  @IsOptional() @IsDateString() whatsappOptInAt?: string;
  @IsOptional() @IsDateString() whatsappMarketingOptInAt?: string;

  @IsOptional() @IsString() @MaxLength(160) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyContactPhone?: string;
}

export class UpdatePatientDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{3,40}$/)
  medicalRecordNumber?: string;

  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsDateString() admittedAt?: string;
  @IsOptional() @IsString() @MaxLength(40) gender?: string;
  @Transform(({ value }) => normalizeMaritalStatus(value), { toClassOnly: true })
  @IsOptional() @IsIn(['single', 'married', 'divorced', 'widowed', 'other']) maritalStatus?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(30) whatsappPhone?: string;
  @IsOptional() @IsBoolean() whatsappOptIn?: boolean;
  @IsOptional() @IsBoolean() whatsappMarketingOptIn?: boolean;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;

  // CRM / Marketing fields
  @IsOptional() @IsString() @MaxLength(120) occupation?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) governorate?: string;
  @IsOptional() @IsString() @MaxLength(120) leadSource?: string;

  @IsOptional() @IsBoolean() marketingConsent?: boolean;

  @IsOptional() @IsDateString() marketingConsentAt?: string;

  @IsOptional() @IsDateString() whatsappOptInAt?: string;
  @IsOptional() @IsDateString() whatsappMarketingOptInAt?: string;

  @IsOptional() @IsString() @MaxLength(160) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyContactPhone?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

export class BulkDeletePatientsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2_500)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  patientIds!: string[];

  @IsInt()
  @Min(1)
  confirmationCount!: number;
}

export class PatientQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}

/** A bounded, validated batch used by the migration centre. */
export class ImportPatientsDto {
  @IsArray()
  // Large files are delivered as independently validated chunks. Keeping an
  // individual request bounded prevents a 300k-row migration from timing out.
  @ArrayMaxSize(1_000)
  @ValidateNested({ each: true })
  @Type(() => CreatePatientDto)
  patients!: CreatePatientDto[];
}

export class MarketingAudienceQueryDto {
  @IsOptional() @IsString() @MaxLength(120) governorate?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(40) gender?: string;
  @IsOptional() @IsString() @MaxLength(120) leadSource?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(130) minAge?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(130) maxAge?: number;
}
