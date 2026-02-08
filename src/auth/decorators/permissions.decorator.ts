import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declare required permission for a route (same pattern as adib_backend).
 * Use with PermissionsGuard. Example: @Permissions('Reporting', ['show'])
 */
export const Permissions = (page: string, actions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { page, actions });
