import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const CLINICAL_RECORD_CATEGORIES = [
  'clinical_note',
  'medical_history',
  'allergy',
  'chronic_condition',
  'medication',
  'follow_up',
  'prescription',
] as const;

export type ClinicalRecordCategory = typeof CLINICAL_RECORD_CATEGORIES[number];

export class CreateClinicalRecordDto {
  @IsIn(CLINICAL_RECORD_CATEGORIES) category!: ClinicalRecordCategory;
  @IsString() @MinLength(1) @MaxLength(10000) content!: string;
  @IsOptional() @IsString() @MaxLength(4000) symptoms?: string;
  @IsOptional() @IsString() @MaxLength(4000) diagnosis?: string;
  @IsOptional() @IsString() @MaxLength(4000) treatmentPlan?: string;
}

export class UpdateClinicalRecordDto {
  @IsOptional() @IsIn(CLINICAL_RECORD_CATEGORIES) category?: ClinicalRecordCategory;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(10000) content?: string;
  @IsOptional() @IsString() @MaxLength(4000) symptoms?: string;
  @IsOptional() @IsString() @MaxLength(4000) diagnosis?: string;
  @IsOptional() @IsString() @MaxLength(4000) treatmentPlan?: string;
}
