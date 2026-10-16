import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('api/dashboard')
@UseGuards(PermissionsGuard)
@Permissions('Dashboard', ['show'])
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Dashboard activity ("last seen" per dashboard) belongs to the signed-in user: the user comes
  // from the verified token, never from the request, so nobody can read or write another user's.
  private static userIdOf(req: { user?: { id?: unknown; sub?: unknown } }): string {
    const id = String(req.user?.id ?? req.user?.sub ?? '').trim().toLowerCase();
    if (!id) throw new BadRequestException('User not identified');
    return id;
  }

  @Get('activity')
  async getDashboardActivities(@Req() req: { user?: { id?: unknown; sub?: unknown } }) {
    // Initialize table if it doesn't exist
    await this.dashboardService.createActivityTable();

    return await this.dashboardService.getDashboardActivities(DashboardController.userIdOf(req));
  }

  @Post('activity')
  @Permissions('Dashboard', ['show'], true)
  async updateDashboardActivity(
    @Req() req: { user?: { id?: unknown; sub?: unknown } },
    @Body() body: { dashboard_id: string; card_count?: number },
  ) {
    const dashboardId = String(body?.dashboard_id ?? '').trim();
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(dashboardId)) {
      throw new BadRequestException('dashboard_id is required');
    }
    const cardCount = Number.isInteger(body?.card_count) && (body.card_count as number) >= 0 ? (body.card_count as number) : 0;

    // Initialize table if it doesn't exist
    await this.dashboardService.createActivityTable();

    return await this.dashboardService.updateDashboardActivity(dashboardId, DashboardController.userIdOf(req), cardCount);
  }
}
