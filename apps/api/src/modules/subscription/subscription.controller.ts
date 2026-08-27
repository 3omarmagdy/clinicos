import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthContext } from '@clinicos/shared-types';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateManualPaymentDto } from './subscription.dto';
import { PLAN_CATALOG, SubscriptionService } from './subscription.service';

@Controller('subscriptions')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class SubscriptionController {
  constructor(private readonly subscriptions: SubscriptionService) {}
  @Get('plans') plans() { return PLAN_CATALOG; }
  @Get('payment-instructions') @RequirePermissions('organization:read') paymentInstructions() { return this.subscriptions.paymentInstructions(); }
  @Get('current') @RequirePermissions('organization:read') current(@Req() req: { user: AuthContext }) { return this.subscriptions.current(req.user.organizationId); }
  @Get('payments') @RequirePermissions('organization:read') payments(@Req() req: { user: AuthContext }) { return this.subscriptions.listPayments(req.user.organizationId); }
  @Post('payments') @RequirePermissions('organization:update') payment(@Req() req: { user: AuthContext }, @Body() data: CreateManualPaymentDto) { return this.subscriptions.requestPayment(req.user.organizationId, data, req.user.userId); }
}
