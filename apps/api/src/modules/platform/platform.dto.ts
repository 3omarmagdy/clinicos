import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsIn(['trial', 'clinic', 'center', 'enterprise'])
  plan!: string;

  @IsIn(['trial', 'active', 'suspended', 'expired'])
  status!: string;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string | null;

  @IsOptional()
  @IsDateString()
  subscriptionEndsAt?: string | null;
}
