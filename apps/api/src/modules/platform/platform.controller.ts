import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformService } from './platform.service';
import { UpdateSubscriptionDto } from './platform.dto';

@Controller('platform')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('organizations')
  listOrganizations() { return this.platform.listOrganizations(); }

  @Patch('organizations/:id/subscription')
  updateSubscription(@Param('id') id: string, @Body() data: UpdateSubscriptionDto) {
    return this.platform.updateSubscription(id, data);
  }
}
