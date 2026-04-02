import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { fq } from './db-config';

export interface UserFunctionAccess {
  isSuperAdmin: boolean;
  functionIds: string[];
}

type UserFunctionItem = { id: string; name: string };

@Injectable()
export class UserFunctionAccessService {
  private readonly accessCacheTtlMs =
    Number(process.env.USER_FUNCTION_ACCESS_CACHE_TTL) > 0
      ? Number(process.env.USER_FUNCTION_ACCESS_CACHE_TTL)
      : 5 * 60 * 1000;
  private readonly accessCache = new Map<string, { expiresAt: number; value: UserFunctionAccess }>();
  private readonly accessInflight = new Map<string, Promise<UserFunctionAccess>>();
  private readonly userFunctionsCache = new Map<string, { expiresAt: number; value: UserFunctionItem[] }>();
  private readonly userFunctionsInflight = new Map<string, Promise<UserFunctionItem[]>>();
  private allFunctionsCache: { expiresAt: number; value: UserFunctionItem[] } | null = null;
  private allFunctionsInflight: Promise<UserFunctionItem[]> | null = null;

  constructor(private readonly db: DatabaseService) {}

  /** Align with `normalizeGrcFunctionIdPart` / query parsing so DB padding and URL `+` never break access checks. */
  private normalizeFunctionId(id: unknown): string {
    return String(id ?? '')
      .replace(/\+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private sqlQuoteId(id: string): string {
    return `'${this.normalizeFunctionId(id).replace(/'/g, "''")}'`;
  }

  private sqlInSelectedIds(ids: string[]): string {
    return ids.map((id) => this.sqlQuoteId(id)).join(', ');
  }

  /** Non-super users must have access to every selected function id. */
  private canUseSelectedIds(access: UserFunctionAccess, selected: string[]): boolean {
    if (!selected.length) return true;
    if (access.isSuperAdmin) return true;
    const allowed = new Set(access.functionIds.map((id) => this.normalizeFunctionId(id)));
    return selected.every((id) => allowed.has(this.normalizeFunctionId(id)));
  }

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

  private buildCacheKey(userId: string, groupName?: string, role?: string, isAdmin?: boolean): string {
    return [
      userId,
      String(groupName ?? ''),
      String(role ?? ''),
      isAdmin === true ? '1' : '0',
    ].join('|');
  }

  private getCachedValue<T>(
    store: Map<string, { expiresAt: number; value: T }>,
    key: string,
  ): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCachedValue<T>(
    store: Map<string, { expiresAt: number; value: T }>,
    key: string,
    value: T,
  ): T {
    store.set(key, {
      expiresAt: Date.now() + this.accessCacheTtlMs,
      value,
    });
    return value;
  }

  private normalizeFunctionRows(rows: any[]): UserFunctionItem[] {
    return (rows || []).map((r: any) => ({
      id: this.normalizeFunctionId(r.id),
      name: String(r.name ?? ''),
    }));
  }

  private setAssignedFunctionsCaches(cacheKey: string, rows: any[]): UserFunctionItem[] {
    const functions = this.normalizeFunctionRows(rows);
    this.setCachedValue(this.userFunctionsCache, cacheKey, functions);
    this.setCachedValue(this.accessCache, cacheKey, {
      isSuperAdmin: false,
      functionIds: functions.map((item) => item.id),
    });
    return functions;
  }

  private async getAllFunctions(): Promise<UserFunctionItem[]> {
    if (this.allFunctionsCache && this.allFunctionsCache.expiresAt > Date.now()) {
      return this.allFunctionsCache.value;
    }
    if (this.allFunctionsInflight) {
      return this.allFunctionsInflight;
    }

    const query = `
      SELECT f.id, f.name
      FROM ${fq('Functions')} f
      WHERE f.isDeleted = 0
        AND f.deletedAt IS NULL
      ORDER BY f.name
    `;

    this.allFunctionsInflight = this.db.query(query)
      .then((rows) => this.normalizeFunctionRows(rows))
      .then((functions) => {
        this.allFunctionsCache = {
          expiresAt: Date.now() + this.accessCacheTtlMs,
          value: functions,
        };
        return functions;
      })
      .finally(() => {
        this.allFunctionsInflight = null;
      });

    return this.allFunctionsInflight;
  }

  private async getAssignedFunctions(cacheKey: string, userId: string): Promise<UserFunctionItem[]> {
    const cached = this.getCachedValue(this.userFunctionsCache, cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = this.userFunctionsInflight.get(cacheKey);
    if (inFlight) {
      return inFlight;
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

    const promise = this.db.query(query, [userId])
      .then((rows) => this.setAssignedFunctionsCaches(cacheKey, rows))
      .finally(() => {
        this.userFunctionsInflight.delete(cacheKey);
      });

    this.userFunctionsInflight.set(cacheKey, promise);
    return promise;
  }

  /**
   * Get the list of function IDs a user has access to, plus super-admin flag.
   * Admin: all data when no function selected; filter list shows all functions.
   * Normal user: only their functions in filter and in data.
   */
  async getUserFunctionAccess(
    userIdOrUser: string | { id: string; groupName?: string; group?: string; role?: string; title?: string; isAdmin?: boolean },
    groupName?: string,
    role?: string,
    isAdminFlag?: boolean,
  ): Promise<UserFunctionAccess> {
    const userId = typeof userIdOrUser === 'object' ? userIdOrUser.id : userIdOrUser;
    const g = typeof userIdOrUser === 'object' ? (userIdOrUser.groupName ?? userIdOrUser.group) : groupName;
    const r = typeof userIdOrUser === 'object' ? (userIdOrUser.role ?? userIdOrUser.title) : role;
    const adm = typeof userIdOrUser === 'object' ? userIdOrUser.isAdmin : isAdminFlag;
    const isSuperAdmin = this.isAdmin(userId, g, r, adm);
    if (isSuperAdmin) {
      return { isSuperAdmin: true, functionIds: [] };
    }

    const cacheKey = this.buildCacheKey(userId, g, r, adm);
    const cached = this.getCachedValue(this.accessCache, cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = this.accessInflight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const promise = (async () => {
      try {
        const functions = await this.getAssignedFunctions(cacheKey, userId);
        return {
          isSuperAdmin: false,
          functionIds: functions.map((item) => item.id),
        };
      } catch (e: any) {
        const msg = (e?.message || String(e)) as string;
        if (msg.includes('Invalid object name') && msg.includes('UserFunction')) {
          const seeAll = process.env.REPORTS_EMPTY_FUNCTIONS_SEE_ALL === 'true';
          if (seeAll) {
            return this.setCachedValue(this.accessCache, cacheKey, { isSuperAdmin: true, functionIds: [] });
          }
          return this.setCachedValue(this.accessCache, cacheKey, { isSuperAdmin: false, functionIds: [] });
        }
        throw e;
      } finally {
        this.accessInflight.delete(cacheKey);
      }
    })();

    this.accessInflight.set(cacheKey, promise);
    return promise;
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
    selectedFunctionIds?: string[],
  ): string {
    const sel = selectedFunctionIds?.length
      ? [...new Set(selectedFunctionIds.map((id) => this.normalizeFunctionId(id)).filter(Boolean))]
      : [];
    if (sel.length) {
      if (!this.canUseSelectedIds(access, sel)) {
        return ' AND 1 = 0';
      }
      return ` AND ${tableAlias}.${column} IN (${this.sqlInSelectedIds(sel)})`;
    }

    // If no specific function selected, super admins see everything (all functions)
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
    selectedFunctionIds?: string[],
  ): string {
    const sel = selectedFunctionIds?.length
      ? [...new Set(selectedFunctionIds.map((id) => this.normalizeFunctionId(id)).filter(Boolean))]
      : [];
    if (sel.length) {
      if (!this.canUseSelectedIds(access, sel)) {
        return ' AND 1 = 0';
      }
      return ` AND ${tableAlias}.related_function_id IN (${this.sqlInSelectedIds(sel)})`;
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
    selectedFunctionIds?: string[],
  ): string {
    const sel = selectedFunctionIds?.length
      ? [...new Set(selectedFunctionIds.map((id) => this.normalizeFunctionId(id)).filter(Boolean))]
      : [];
    if (sel.length) {
      if (!this.canUseSelectedIds(access, sel)) {
        return ' AND 1 = 0';
      }
      return ` AND EXISTS (
        SELECT 1
        FROM ${fq('RiskFunctions')} rf
        WHERE rf.risk_id = ${tableAlias}.id
          AND rf.function_id IN (${this.sqlInSelectedIds(sel)})
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
    selectedFunctionIds?: string[],
  ): string {
    const sel = selectedFunctionIds?.length
      ? [...new Set(selectedFunctionIds.map((id) => this.normalizeFunctionId(id)).filter(Boolean))]
      : [];
    if (sel.length) {
      if (!this.canUseSelectedIds(access, sel)) {
        return ' AND 1 = 0';
      }
      return ` AND EXISTS (
        SELECT 1
        FROM ${fq('ControlFunctions')} cf
        WHERE cf.control_id = ${tableAlias}.id
          AND cf.function_id IN (${this.sqlInSelectedIds(sel)})
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
   * Restrict rows on an outer ControlFunctions join (alias e.g. cf) so queries that GROUP BY function
   * only attribute controls to the selected function / user's allowed functions — not every function link.
   * Use placeholder {functionJoinFilter} on charts that join c → cf → f.
   */
  buildControlFunctionJoinFilter(
    cfAlias: string,
    access: UserFunctionAccess,
    selectedFunctionIds?: string[],
  ): string {
    const sel = selectedFunctionIds?.length
      ? [...new Set(selectedFunctionIds.map((id) => this.normalizeFunctionId(id)).filter(Boolean))]
      : [];
    if (sel.length) {
      if (!this.canUseSelectedIds(access, sel)) {
        return ' AND 1 = 0';
      }
      return ` AND ${cfAlias}.function_id IN (${this.sqlInSelectedIds(sel)})`;
    }
    if (access.isSuperAdmin) return '';
    if (!access.functionIds.length) {
      if (process.env.REPORTS_EMPTY_FUNCTIONS_SEE_ALL === 'true') return '';
      return ' AND 1 = 0';
    }
    const ids = access.functionIds.map((id) => `'${id}'`).join(', ');
    return ` AND ${cfAlias}.function_id IN (${ids})`;
  }

  /**
   * Get user functions with names for display in UI.
   * Admin: returns all functions so they can choose from dropdown.
   * Normal user: returns only their assigned functions; if one function, UI can show direct data.
   */
  async getUserFunctions(
    userIdOrUser: string | { id: string; groupName?: string; group?: string; role?: string; title?: string; isAdmin?: boolean },
    groupName?: string,
    role?: string,
    isAdminFlag?: boolean,
  ): Promise<UserFunctionItem[]> {
    const userId = typeof userIdOrUser === 'object' ? userIdOrUser.id : userIdOrUser;
    const g = typeof userIdOrUser === 'object' ? (userIdOrUser.groupName ?? userIdOrUser.group) : groupName;
    const r = typeof userIdOrUser === 'object' ? (userIdOrUser.role ?? userIdOrUser.title) : role;
    const adm = typeof userIdOrUser === 'object' ? userIdOrUser.isAdmin : isAdminFlag;
    const isSuperAdmin = this.isAdmin(userId, g, r, adm);
    const cacheKey = this.buildCacheKey(userId, g, r, adm);

    const promise = (async () => {
      try {
        if (isSuperAdmin) {
          const allFunctions = await this.getAllFunctions();
          return this.setCachedValue(this.userFunctionsCache, cacheKey, allFunctions);
        }

        return await this.getAssignedFunctions(cacheKey, userId);
      } catch (e: any) {
        const msg = (e?.message || String(e)) as string;
        if (msg.includes('Invalid object name') && msg.includes('UserFunction')) {
          if (process.env.REPORTS_EMPTY_FUNCTIONS_SEE_ALL === 'true') {
            const allFunctions = await this.getAllFunctions();
            return this.setCachedValue(this.userFunctionsCache, cacheKey, allFunctions);
          }
          return this.setCachedValue(this.userFunctionsCache, cacheKey, []);
        }
        throw e;
      }
    })();

    return promise;
  }
}

