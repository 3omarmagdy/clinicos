import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

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
}
