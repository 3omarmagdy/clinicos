import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const paidPlans = ['STARTER', 'PROFESSIONAL', 'CLINIC', 'CENTER'] as const;

export class CreateManualPaymentDto {
  @IsIn(paidPlans)
  plan!: (typeof paidPlans)[number];

  @IsString()
  @MaxLength(100)
  reference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentMethod?: string;
}

export class ReviewPaymentDto {
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  rejectionReason?: string;
}
