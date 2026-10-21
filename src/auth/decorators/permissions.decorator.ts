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

export const MODULE_PAGE_KEY = 'modulePage';

/**
 * The module's own DCC page (e.g. `Risk Catalog` for the risks dashboard), checked IN ADDITION
 * to `@Permissions` — the dashboard tab alone no longer opens every module's data.
 * Page names are the main backend's `src/group/page-catalog.ts` names.
 */
export const ModulePage = (page: string, actions: string[] = ['show']) =>
  SetMetadata(MODULE_PAGE_KEY, { page, actions } satisfies PermissionsMeta);
