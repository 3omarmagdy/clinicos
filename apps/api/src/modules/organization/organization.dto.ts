import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateOrganizationDto {
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
