import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { fq } from './db-config';

export interface UserFunctionAccess {
  isSuperAdmin: boolean;
  functionIds: string[];
}

@Injectable()
export class UserFunctionAccessService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Whether the user is admin (sees all functions and all data when no filter selected).
   * Admin: groupName === 'super_admin_' from main backend, or userId in REPORTING_SUPER_ADMIN_USER_IDS, or role === 'admin' / isAdmin.
   */
  private isAdmin(userId: string, groupName?: string, role?: string, isAdmin?: boolean): boolean {
    if (groupName === 'super_admin_') return true;
    const allowedIds = (process.env.REPORTING_SUPER_ADMIN_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (allowedIds.includes(userId)) return true;
    if (role === 'admin' || isAdmin === true) return true;
    return false;
  }

  /**
   * Get the list of function IDs a user has access to, plus super-admin flag.
   * Admin: all data when no function selected; filter list shows all functions.
   * Normal user: only their functions in filter and in data.
   */
  async getUserFunctionAccess(
    userIdOrUser: string | { id: string; groupName?: string; role?: string; isAdmin?: boolean },
    groupName?: string,
    role?: string,
    isAdminFlag?: boolean,
  ): Promise<UserFunctionAccess> {
    const userId = typeof userIdOrUser === 'object' ? userIdOrUser.id : userIdOrUser;
    const g = typeof userIdOrUser === 'object' ? userIdOrUser.groupName : groupName;
    const r = typeof userIdOrUser === 'object' ? userIdOrUser.role : role;
    const adm = typeof userIdOrUser === 'object' ? userIdOrUser.isAdmin : isAdminFlag;
    const isSuperAdmin = this.isAdmin(userId, g, r, adm);
    if (isSuperAdmin) {
      return { isSuperAdmin: true, functionIds: [] };
    }

    // Match UserFunction / Functions structure in the main backend
    const query = `
      SELECT uf.functionId AS id
      FROM ${fq('UserFunction')} uf
      JOIN ${fq('Functions')} f ON f.id = uf.functionId
      WHERE uf.userId = @param0
        AND uf.deletedAt IS NULL
        AND f.isDeleted = 0
        AND f.deletedAt IS NULL
    `;

    const rows = await this.db.query(query, [userId]);
    const functionIds = rows.map((r: any) => r.id as string);

    return {
      isSuperAdmin: false,
      functionIds,
    };
  }

  /**
   * Build a simple filter for tables that have a direct function column.
   * Example: buildDirectFunctionFilter('i', 'function_id', access)
   * returns: " AND i.function_id IN ('...','...')" or " AND 1 = 0" if user has no functions.
   * If selectedFunctionId is provided, filters by that specific function only (after verifying user has access).
   */
  buildDirectFunctionFilter(
    tableAlias: string,
    column: string,
    access: UserFunctionAccess,
    selectedFunctionId?: string,
  ): string {
    // If a specific function is selected, filter by that only (even for super admins)
    if (selectedFunctionId) {
      // For super admins, allow any functionId
      // For regular users, verify they have access to this function
      if (!access.isSuperAdmin && !access.functionIds.includes(selectedFunctionId)) {
        return ' AND 1 = 0';
      }
      return ` AND ${tableAlias}.${column} = '${selectedFunctionId}'`;
    }

    // If no specific function selected, super admins see everything
    if (access.isSuperAdmin) return '';

    if (!access.functionIds.length) {
      // User has no functions → no data
      return ' AND 1 = 0';
    }

    const ids = access.functionIds.map((id) => `'${id}'`).join(', ');
    return ` AND ${tableAlias}.${column} IN (${ids})`;
  }

  /**
   * Build a filter for KRIs that matches adib_backend logic:
   * Only filters by related_function_id (not the KriFunctions join table).
   * Returns: " AND k.related_function_id IN (...)" or " AND 1 = 0" if user has no functions.
   * If selectedFunctionId is provided, filters by that specific function only (after verifying user has access).
   * Super admin gets no filter (sees all) unless a specific function is selected.
   */
  buildKriFunctionFilter(
    tableAlias: string,
    access: UserFunctionAccess,
    selectedFunctionId?: string,
  ): string {
    // If a specific function is selected, filter by that only (even for super admins)
    if (selectedFunctionId) {
      // For super admins, allow any functionId
      // For regular users, verify they have access to this function
      if (!access.isSuperAdmin && !access.functionIds.includes(selectedFunctionId)) {
        return ' AND 1 = 0';
      }
      return ` AND ${tableAlias}.related_function_id = '${selectedFunctionId}'`;
    }

    // If no specific function selected, super admins see everything
    if (access.isSuperAdmin) return '';

    if (!access.functionIds.length) {
      // When user has no function assignments, by default they see nothing (secure).
      // Set REPORTS_EMPTY_FUNCTIONS_SEE_ALL=true to let them see all data (e.g. reporting DB has no UserFunction rows yet).
      if (process.env.REPORTS_EMPTY_FUNCTIONS_SEE_ALL === 'true') {
        return '';
      }
      return ' AND 1 = 0';
    }

    const ids = access.functionIds.map((id) => `'${id}'`).join(', ');
    return ` AND ${tableAlias}.related_function_id IN (${ids})`;
  }

  /**
   * Build a filter for Risks that matches adib_backend controls logic:
   * Filters via RiskFunctions join table (many-to-many relationship).
   * Returns: " AND EXISTS (SELECT 1 FROM RiskFunctions rf WHERE ...)" or " AND 1 = 0" if user has no functions.
   * If selectedFunctionId is provided, filters by that specific function only (after verifying user has access).
   * Super admin gets no filter (sees all) unless a specific function is selected.
   */
  buildRiskFunctionFilter(
    tableAlias: string,
    access: UserFunctionAccess,
    selectedFunctionId?: string,
  ): string {
    // If a specific function is selected, filter by that only (even for super admins)
    if (selectedFunctionId) {
      // For super admins, allow any functionId
      // For regular users, verify they have access to this function
      if (!access.isSuperAdmin && !access.functionIds.includes(selectedFunctionId)) {
        return ' AND 1 = 0';
      }
      return ` AND EXISTS (
        SELECT 1
        FROM ${fq('RiskFunctions')} rf
        WHERE rf.risk_id = ${tableAlias}.id
          AND rf.function_id = '${selectedFunctionId}'
          AND rf.deletedAt IS NULL
      )`;
    }

    // If no specific function selected, super admins see everything
    if (access.isSuperAdmin) return '';

    if (!access.functionIds.length) {
      if (process.env.REPORTS_EMPTY_FUNCTIONS_SEE_ALL === 'true') return '';
      return ' AND 1 = 0';
    }

    const ids = access.functionIds.map((id) => `'${id}'`).join(', ');
    return ` AND EXISTS (
      SELECT 1
      FROM ${fq('RiskFunctions')} rf
      WHERE rf.risk_id = ${tableAlias}.id
        AND rf.function_id IN (${ids})
        AND rf.deletedAt IS NULL
    )`;
  }

  /**
   * Build a filter for Controls that matches adib_backend controls logic:
   * Filters via ControlFunctions join table (many-to-many relationship).
   * Returns: " AND EXISTS (SELECT 1 FROM ControlFunctions cf WHERE ...)" or " AND 1 = 0" if user has no functions.
   * If selectedFunctionId is provided, filters by that specific function only (after verifying user has access).
   * Super admin gets no filter (sees all) unless a specific function is selected.
   */
  buildControlFunctionFilter(
    tableAlias: string,
    access: UserFunctionAccess,
    selectedFunctionId?: string,
  ): string {
    // console.log('[buildControlFunctionFilter] Called with:', { tableAlias, isSuperAdmin: access.isSuperAdmin, selectedFunctionId, hasFunctionIds: access.functionIds.length });
    
    // If a specific function is selected, filter by that only (even for super admins)
    // Treat empty string as no selection
    if (selectedFunctionId && selectedFunctionId.trim() !== '') {
      // For super admins, allow any functionId
      // For regular users, verify they have access to this function
      if (!access.isSuperAdmin && !access.functionIds.includes(selectedFunctionId)) {
        return ' AND 1 = 0';
      }
      return ` AND EXISTS (
        SELECT 1
        FROM ${fq('ControlFunctions')} cf
        WHERE cf.control_id = ${tableAlias}.id
          AND cf.function_id = '${selectedFunctionId}'
          AND cf.deletedAt IS NULL
      )`;
    }

    // If no specific function selected, super admins see everything
    if (access.isSuperAdmin) return '';

    if (!access.functionIds.length) {
      if (process.env.REPORTS_EMPTY_FUNCTIONS_SEE_ALL === 'true') return '';
      return ' AND 1 = 0';
    }

    const ids = access.functionIds.map((id) => `'${id}'`).join(', ');
    return ` AND EXISTS (
      SELECT 1
      FROM ${fq('ControlFunctions')} cf
      WHERE cf.control_id = ${tableAlias}.id
        AND cf.function_id IN (${ids})
        AND cf.deletedAt IS NULL
    )`;
  }

  /**
   * Get user functions with names for display in UI.
   * Admin: returns all functions so they can choose from dropdown.
   * Normal user: returns only their assigned functions; if one function, UI can show direct data.
   */
  async getUserFunctions(
    userIdOrUser: string | { id: string; groupName?: string; role?: string; isAdmin?: boolean },
    groupName?: string,
    role?: string,
    isAdminFlag?: boolean,
  ): Promise<Array<{ id: string; name: string }>> {
    const userId = typeof userIdOrUser === 'object' ? userIdOrUser.id : userIdOrUser;
    const g = typeof userIdOrUser === 'object' ? userIdOrUser.groupName : groupName;
    const r = typeof userIdOrUser === 'object' ? userIdOrUser.role : role;
    const adm = typeof userIdOrUser === 'object' ? userIdOrUser.isAdmin : isAdminFlag;
    const isSuperAdmin = this.isAdmin(userId, g, r, adm);

    if (isSuperAdmin) {
      // Admin sees all functions in filter
      const query = `
        SELECT f.id, f.name
        FROM ${fq('Functions')} f
        WHERE f.isDeleted = 0
          AND f.deletedAt IS NULL
        ORDER BY f.name
      `;
      const rows = await this.db.query(query);
      return rows.map((r: any) => ({ id: r.id, name: r.name }));
    }

    const query = `
      SELECT f.id, f.name
      FROM ${fq('UserFunction')} uf
      JOIN ${fq('Functions')} f ON f.id = uf.functionId
      WHERE uf.userId = @param0
        AND uf.deletedAt IS NULL
        AND f.isDeleted = 0
        AND f.deletedAt IS NULL
      ORDER BY f.name
    `;

    const rows = await this.db.query(query, [userId]);
    return rows.map((r: any) => ({ id: r.id, name: r.name }));
  }
}

