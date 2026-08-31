import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateServiceDto {
  @IsString() @MinLength(2) @MaxLength(160)
  name!: string;

  @IsInt() @Min(5) @Max(480)
  durationMinutes!: number;

  @IsOptional() @IsInt() @Min(0) @Max(100000000)
  price?: number;
}

export class UpdateServiceDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160)
  name?: string;

  @IsOptional() @IsInt() @Min(5) @Max(480)
  durationMinutes?: number;

  @IsOptional() @IsInt() @Min(0) @Max(100000000)
  price?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateOrganizationDto {
  @IsString() @IsIn(['CLINIC', 'HOSPITAL', 'CENTER', 'RADIOLOGY_CENTER'])
  facilityType!: string;

  @IsString() @IsIn(['GENERAL', 'DENTAL', 'SURGERY', 'RADIOLOGY', 'OBGYN', 'OPHTHALMOLOGY', 'UROLOGY', 'BEAUTY', 'LAB'])
  specialty!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn(['Africa/Cairo', 'UTC'])
  timezone!: string;

  @IsString()
  @IsIn(['EGP', 'USD', 'SAR'])
  currency!: string;

  @IsOptional() @IsString() @MaxLength(160)
  prescriptionHeader?: string;

  @IsOptional() @IsString() @MaxLength(220)
  prescriptionSubheader?: string;

  @IsOptional() @IsString() @MaxLength(60)
  prescriptionPhone?: string;

  @IsOptional() @IsString() @MaxLength(240)
  prescriptionAddress?: string;

  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(1000)
  prescriptionLogoUrl?: string;
}
