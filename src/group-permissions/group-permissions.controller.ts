import { Controller, Get, Logger, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { GroupPermissionsService } from './group-permissions.service';

/** Path kept for frontend: `GET …/api/main/groups/permissions?page=…` */
@Controller('api/main')
export class GroupPermissionsController {
  private readonly logger = new Logger(GroupPermissionsController.name);

  constructor(private readonly groupPermissionsService: GroupPermissionsService) {}

  @Get('groups/permissions')
  getGroupPermissions(@Req() req: Request, @Query('page') page?: string) {
    if (typeof page !== 'string' || page.length === 0 || page.length > 200) {
      const line = `[GroupPermissions] success=false message=Invalid_page query_page=${String(page)}`;
      this.logger.warn(line);
      console.warn(line);
      return { success: false, message: 'Invalid page' };
    }
    const safePage = page.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
    if (!safePage) {
      const line = `[GroupPermissions] success=false message=Invalid_page_after_sanitize`;
      this.logger.warn(line);
      console.warn(line);
      return { success: false, message: 'Invalid page' };
    }

    const r = req as Request & { user?: unknown; reportingJwtSource?: string };
    const user = r.user;
    if (!user) {
      const line = `[GroupPermissions] success=false message=Unauthorized page=${safePage} (no req.user — JWT guard may not have run)`;
      this.logger.warn(line);
      console.warn(line);
      return { success: false, message: 'Unauthorized' };
    }

    const jwtSource = r.reportingJwtSource ?? '(unknown)';
    const claim_keys =
      user && typeof user === 'object' ? Object.keys(user as Record<string, unknown>).sort() : [];
    return this.groupPermissionsService.resolveForPage(user, safePage, { jwtSource, claim_keys });
  }
}
