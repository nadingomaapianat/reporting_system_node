import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export type PermissionsMeta = {
  page: string;
  actions: string[];
  /** When true, user must satisfy every action in `actions` on that page (e.g. create and edit). */
  requireAll?: boolean;
};

/**
 * Declare required DCC page + actions (JWT `user.permissions` rows).
 * @param requireAll — set `true` when both `create` and `edit` (or every listed flag) must be true.
 */
export const Permissions = (page: string, actions: string[], requireAll = false) =>
  SetMetadata(PERMISSIONS_KEY, { page, actions, requireAll } satisfies PermissionsMeta);
