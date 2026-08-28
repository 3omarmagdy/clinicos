import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterClinicDto {
  @IsString() @IsIn(['CLINIC', 'HOSPITAL', 'CENTER', 'RADIOLOGY_CENTER']) facilityType!: string;
  @IsString() @IsIn(['GENERAL', 'DENTAL', 'SURGERY', 'RADIOLOGY', 'OBGYN', 'OPHTHALMOLOGY', 'UROLOGY', 'BEAUTY']) specialty!: string;
  @IsString() @MinLength(2) @MaxLength(120) clinicName!: string;
  @IsString() @MinLength(2) @MaxLength(80) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(80) lastName!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(10) @MaxLength(128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'Password must include at least one letter and one number' })
  password!: string;
}
