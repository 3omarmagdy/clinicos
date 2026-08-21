import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AppointmentQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateAppointmentDto {
  @IsString() @MaxLength(80) patientId!: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsInt() @Min(10) @Max(480) durationMinutes?: number;
  @IsOptional() @IsString() @MaxLength(240) reason?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateAppointmentStatusDto {
  @IsIn(['scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show']) status!: string;
}
