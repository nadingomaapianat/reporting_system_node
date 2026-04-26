import { Controller, Get, Logger, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { MainBackendBridgeService } from './main-backend-bridge.service';

/**
 * BFF routes: authenticated reporting users call these URLs; the node forwards to MAIN_BACKEND_URL
 * with the same Cookie header so main-backend JWT cookies apply.
 */
@Controller('api/main')
export class MainBackendProxyController {
  private readonly logger = new Logger(MainBackendProxyController.name);

  constructor(private readonly bridge: MainBackendBridgeService) {}

  @Get('groups/permissions')
  async groupPermissions(@Req() req: Request, @Query('page') page?: string) {
    if (typeof page !== 'string' || page.length === 0 || page.length > 200) {
      return { success: false, message: 'Invalid page' };
    }
    const safePage = page.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
    if (!safePage) {
      return { success: false, message: 'Invalid page' };
    }

    const result = await this.bridge.forwardGet(
      '/groups/permissions',
      `page=${encodeURIComponent(safePage)}`,
      req,
    );

    if (result.status === 200 && result.data && typeof result.data === 'object') {
      return result.data;
    }

    if (result.status !== 200) {
      this.logger.debug(`groups/permissions proxy status=${result.status} page=${safePage.slice(0, 80)}`);
    }

    return { success: false };
  }
}
