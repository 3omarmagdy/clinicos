import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AppointmentQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  doctorId?: string;
}

export class CreateAppointmentDto {
  @IsString()
  @MaxLength(80)
  patientId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  doctorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceId?: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  doctorId?: string | null;
}

export class UpdateAppointmentStatusDto {
  @IsIn(['scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'])
  status!: string;
}

export class UpdateVisitDto {
  @IsOptional()
  @IsIn(['in_progress', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
