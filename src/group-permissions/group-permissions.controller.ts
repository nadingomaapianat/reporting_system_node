import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { GroupPermissionsService } from './group-permissions.service';

/** Path kept for frontend: `GET …/api/main/groups/permissions?page=…` */
@Controller('api/main')
export class GroupPermissionsController {
  constructor(private readonly groupPermissionsService: GroupPermissionsService) {}

  @Get('groups/permissions')
  getGroupPermissions(@Req() req: Request, @Query('page') page?: string) {
    if (typeof page !== 'string' || page.length === 0 || page.length > 200) {
      return { success: false, message: 'Invalid page' };
    }
    const safePage = page.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
    if (!safePage) {
      return { success: false, message: 'Invalid page' };
    }

    const user = (req as Request & { user?: unknown }).user;
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    return this.groupPermissionsService.resolveForPage(user, safePage);
  }
}
