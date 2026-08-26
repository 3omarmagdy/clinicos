import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformService } from './platform.service';
import { UpdateSubscriptionDto } from './platform.dto';
import { ReviewPaymentDto } from '../subscription/subscription.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import type { AuthContext } from '@clinicos/shared-types';

@Controller('platform')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformController {
  constructor(private readonly platform: PlatformService, private readonly subscriptions: SubscriptionService) {}

  @Get('organizations')
  listOrganizations() { return this.platform.listOrganizations(); }

  @Patch('organizations/:id/subscription')
  updateSubscription(@Param('id') id: string, @Body() data: UpdateSubscriptionDto) {
    return this.platform.updateSubscription(id, data);
  }

  @Get('payments/pending')
  pendingPayments() { return this.subscriptions.listPendingPayments(); }

  @Patch('payments/:id/review')
  reviewPayment(@Param('id') id: string, @Body() data: ReviewPaymentDto, @Req() req: { user: AuthContext }) {
    return this.subscriptions.reviewPayment(id, data, req.user.userId);
  }
}
