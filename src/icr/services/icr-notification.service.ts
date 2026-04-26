import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/** Same style as ADIB `NotificationModel`: human-readable `type` string. */
const ICR_NOTIFICATION_TYPE = 'ICR Section';

/** Logical fields for every ICR notification (mapped into GRC `dbo.Notifications`). */
export type IcrNotificationPersistBody = {
  reportId: number;
  reportTitle: string;
  sectionType: string;
  sectionTitle: string;
  recipientFunction: string;
  action: string;
  message: string;
  triggeredByName: string;
  triggeredById: string;
};

/** Legacy JSON stored in `actionId` (older ICR rows) — still parsed when reading. */
type IcrActionPayloadJson = {
  r: number;
  fn: string;
  a: string;
  st: string;
  tt: string;
  rt: string;
  by: string;
};

export interface IcrNotification {
  type?: 'ICR Section' | 'ICR';
  id?: string;
  reportId: number;
  reportTitle: string;
  sectionType: string;
  sectionTitle: string;
  recipientFunction: string;
  recipientUserId?: string | null;
  action: string;
  message: string;
  triggeredByName: string;
  triggeredById: string;
  isRead: boolean;
  createdAt?: string;
}

function normalizeFunctionLabel(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function truncateNvarchar255(s: string): string {
  const t = String(s ?? '');
  return t.length <= 255 ? t : `${t.slice(0, 252)}...`;
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * ADIB-style `actionId`: slash-separated reference (like `compliance_id/domain_id/control_id`),
 * here: `reportId / normalizedFunctionKey / encodeURIComponent(sectionType) / action`
 */
function buildAdibStyleActionId(row: IcrNotificationPersistBody): string {
  const fnKey = normalizeFunctionLabel(row.recipientFunction);
  let stEnc = encodeURIComponent(row.sectionType);
  const rid = String(row.reportId);
  const act = row.action;
  let path = `${rid}/${fnKey}/${stEnc}/${act}`;
  while (path.length > 255 && stEnc.length > 4) {
    const raw = safeDecodeURIComponent(stEnc);
    stEnc = encodeURIComponent(raw.slice(0, Math.max(4, raw.length - 8)));
    path = `${rid}/${fnKey}/${stEnc}/${act}`;
  }
  if (path.length > 255) {
    path = path.slice(0, 255);
  }
  return path;
}

function tryParseLegacyJsonActionId(raw: string): Partial<IcrActionPayloadJson> | null {
  if (!raw || raw[0] !== '{') return null;
  try {
    return JSON.parse(raw) as IcrActionPayloadJson;
  } catch {
    return null;
  }
}

/** Parse ADIB-style slash `actionId` or legacy JSON. */
function parseStoredActionId(actionId: unknown): {
  reportId: number;
  recipientFunction: string;
  sectionType: string;
  sectionTitle: string;
  reportTitle: string;
  action: string;
  triggeredByName: string;
} {
  const raw = String(actionId ?? '').trim();
  const legacy = tryParseLegacyJsonActionId(raw);
  if (legacy && (legacy.r != null || legacy.a)) {
    return {
      reportId: typeof legacy.r === 'number' ? legacy.r : Number(legacy.r) || 0,
      recipientFunction: String(legacy.fn ?? ''),
      sectionType: String(legacy.st ?? ''),
      sectionTitle: String(legacy.tt ?? ''),
      reportTitle: String(legacy.rt ?? ''),
      action: String(legacy.a ?? ''),
      triggeredByName: String(legacy.by ?? ''),
    };
  }
  const parts = raw.split('/');
  if (parts.length >= 4) {
    const reportId = Number(parts[0]) || 0;
    const recipientFunction = parts[1] ?? '';
    const sectionType = safeDecodeURIComponent(parts[2] ?? '');
    const action = parts.slice(3).join('/');
    return {
      reportId,
      recipientFunction,
      sectionType,
      sectionTitle: '',
      reportTitle: '',
      action,
      triggeredByName: '',
    };
  }
  return {
    reportId: 0,
    recipientFunction: '',
    sectionType: '',
    sectionTitle: '',
    reportTitle: '',
    action: '',
    triggeredByName: '',
  };
}

/** Short messages like ADIB: `You have been assigned to a compliance control action.` */
function icrAdibStyleMessage(action: string): string {
  switch (action) {
    case 'SECTION_ASSIGNED_CHECKER':
      return 'You have been assigned to an ICR section.';
    case 'SUBMITTED_FOR_REVIEW':
      return 'An ICR section was submitted for review.';
    case 'SECTION_APPROVED':
      return 'Your ICR section was approved.';
    case 'SECTION_REJECTED':
      return 'Your ICR section was rejected.';
    default:
      return 'ICR notification.';
  }
}

@Injectable()
export class IcrNotificationService {
  private readonly logger = new Logger(IcrNotificationService.name);

  constructor(private readonly db: DatabaseService) {}

  async ensureTable(): Promise<void> {
    try {
      const rows = await this.db.query(
        `SELECT 1 AS ok WHERE OBJECT_ID(N'dbo.Notifications', N'U') IS NOT NULL`,
        [],
      );
      if (!rows?.length) {
        this.logger.warn('[ICR Notification] dbo.Notifications is missing — ICR alerts will not persist.');
      }
    } catch {
      // ignore
    }
  }

  async listUserIdsForFunctionName(functionName: string): Promise<string[]> {
    const key = normalizeFunctionLabel(functionName);
    if (!key) return [];
    try {
      const rows = await this.db.query(
        `SELECT DISTINCT LOWER(CAST(u.id AS NVARCHAR(200))) AS userId
         FROM dbo.Users u
         INNER JOIN dbo.UserFunction uf ON uf.userId = u.id AND uf.deletedAt IS NULL
         INNER JOIN dbo.Functions f ON f.id = uf.functionId AND f.isDeleted = 0 AND (f.deletedAt IS NULL)
         WHERE LOWER(LTRIM(RTRIM(REPLACE(REPLACE(ISNULL(f.name, N''), CHAR(9), N' '), CHAR(10), N' ')))) = @param0`,
        [key],
      );
      const out: string[] = [];
      for (const r of rows ?? []) {
        const id = String((r as { userId?: string }).userId ?? '').trim();
        if (id) out.push(id);
      }
      return out;
    } catch (err) {
      this.logger.warn(`[ICR Notification] listUserIdsForFunctionName failed: ${(err as Error).message}`);
      return [];
    }
  }

  async notify(params: IcrNotificationPersistBody): Promise<void> {
    await this.ensureTable();
    try {
      await this.persistNotificationRow(params, null);
      this.logger.log(`[ICR Notification] ${params.action} → ${params.recipientFunction}: ${params.message}`);
    } catch (err) {
      this.logger.error(`Failed to save notification: ${err}`);
    }
  }

  private async persistNotificationRow(
    row: IcrNotificationPersistBody,
    recipientUserId: string | null,
  ): Promise<string | null> {
    const toId = recipientUserId != null && String(recipientUserId).trim() !== '' ? String(recipientUserId).trim() : null;
    const fromId = String(row.triggeredById ?? '').trim();
    if (!fromId) {
      this.logger.warn('[ICR Notification] missing triggeredById — cannot insert into Notifications (fromId required).');
      return null;
    }

    const id = randomUUID();
    const actionId = buildAdibStyleActionId(row);
    const message = truncateNvarchar255(row.message);

    const rows = await this.db.query(
      `INSERT INTO dbo.Notifications
         ([id], [message], [fromId], [toId], [type], [actionId], [seen], [createdAt], [updatedAt], [deletedAt], [done], [doneAT], [doneBy])
       OUTPUT inserted.[id] AS id
       VALUES (@param0, @param1, @param2, @param3, @param4, @param5, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), NULL, 0, NULL, NULL)`,
      [id, message, fromId, toId, ICR_NOTIFICATION_TYPE, actionId],
    );
    const outId = (rows?.[0] as { id?: string } | undefined)?.id;
    return outId != null ? String(outId) : id;
  }

  private mapNotificationsTableRow(r: Record<string, unknown>): IcrNotification {
    const parsed = parseStoredActionId(r.actionId);
    const triggeredById = String(r.fromId ?? '');
    const recipientUserId = r.toId != null ? String(r.toId) : null;
    const seen = r.seen === true || r.seen === 1;
    const createdRaw = r.createdAt;
    const dbType = String(r.type ?? '');
    const triggeredByName = parsed.triggeredByName;
    return {
      type: dbType === ICR_NOTIFICATION_TYPE ? 'ICR Section' : 'ICR',
      id: r.id != null ? String(r.id) : undefined,
      reportId: parsed.reportId,
      reportTitle: parsed.reportTitle,
      sectionType: parsed.sectionType,
      sectionTitle: parsed.sectionTitle,
      recipientFunction: parsed.recipientFunction,
      recipientUserId,
      action: parsed.action,
      message: String(r.message ?? ''),
      triggeredByName,
      triggeredById,
      isRead: seen,
      createdAt: createdRaw ? new Date(createdRaw as string | Date).toISOString() : undefined,
    };
  }

  private async broadcastToFunctionUsers(
    functionDisplayName: string,
    base: IcrNotificationPersistBody,
  ): Promise<void> {
    await this.ensureTable();
    const userIds = await this.listUserIdsForFunctionName(functionDisplayName);
    if (!userIds.length) {
      this.logger.warn(
        `[ICR Notification] No users found for function "${functionDisplayName}" — storing function-wide row only.`,
      );
      await this.notify({ ...base, recipientFunction: functionDisplayName });
      return;
    }

    const row: IcrNotificationPersistBody = {
      ...base,
      recipientFunction: functionDisplayName,
    };
    for (const uid of userIds) {
      try {
        await this.persistNotificationRow(row, uid);
      } catch (err) {
        this.logger.error(`[ICR Notification] per-user insert failed for ${uid}: ${err}`);
      }
    }
  }

  async notifySectionAssigned(params: {
    reportId: number;
    reportTitle: string;
    sectionType: string;
    sectionTitle: string;
    makerFunction: string;
    checkerFunction: string;
    assignedByName: string;
    assignedById: string;
  }): Promise<void> {
    const message = icrAdibStyleMessage('SECTION_ASSIGNED_CHECKER');
    await this.broadcastToFunctionUsers(params.checkerFunction, {
      reportId: params.reportId,
      reportTitle: params.reportTitle,
      sectionType: params.sectionType,
      sectionTitle: params.sectionTitle,
      recipientFunction: params.checkerFunction,
      action: 'SECTION_ASSIGNED_CHECKER',
      message,
      triggeredByName: params.assignedByName,
      triggeredById: params.assignedById,
    });
  }

  async notifySubmittedForReview(params: {
    reportId: number;
    reportTitle: string;
    sectionType: string;
    sectionTitle: string;
    makerFunction: string;
    submittedByName: string;
    submittedById: string;
  }): Promise<void> {
    const message = icrAdibStyleMessage('SUBMITTED_FOR_REVIEW');
    await this.broadcastToFunctionUsers(params.makerFunction, {
      reportId: params.reportId,
      reportTitle: params.reportTitle,
      sectionType: params.sectionType,
      sectionTitle: params.sectionTitle,
      recipientFunction: params.makerFunction,
      action: 'SUBMITTED_FOR_REVIEW',
      message,
      triggeredByName: params.submittedByName,
      triggeredById: params.submittedById,
    });
  }

  async notifySectionApproved(params: {
    reportId: number;
    reportTitle: string;
    sectionType: string;
    sectionTitle: string;
    makerFunction: string;
    approvedByName: string;
    approvedById: string;
  }): Promise<void> {
    const message = icrAdibStyleMessage('SECTION_APPROVED');
    await this.broadcastToFunctionUsers(params.makerFunction, {
      reportId: params.reportId,
      reportTitle: params.reportTitle,
      sectionType: params.sectionType,
      sectionTitle: params.sectionTitle,
      recipientFunction: params.makerFunction,
      action: 'SECTION_APPROVED',
      message,
      triggeredByName: params.approvedByName,
      triggeredById: params.approvedById,
    });
  }

  async notifySectionRejected(params: {
    reportId: number;
    reportTitle: string;
    sectionType: string;
    sectionTitle: string;
    makerFunction: string;
    rejectedByName: string;
    rejectedById: string;
    reason: string;
  }): Promise<void> {
    const baseMsg = icrAdibStyleMessage('SECTION_REJECTED');
    const message = truncateNvarchar255(
      params.reason?.trim() ? `${baseMsg} ${params.reason.trim()}` : baseMsg,
    );
    await this.broadcastToFunctionUsers(params.makerFunction, {
      reportId: params.reportId,
      reportTitle: params.reportTitle,
      sectionType: params.sectionType,
      sectionTitle: params.sectionTitle,
      recipientFunction: params.makerFunction,
      action: 'SECTION_REJECTED',
      message,
      triggeredByName: params.rejectedByName,
      triggeredById: params.rejectedById,
    });
  }

  async getNotificationsForFunction(
    recipientFunction: string,
    currentUserId: string | undefined,
    limit = 50,
    unreadOnly = false,
  ): Promise<IcrNotification[]> {
    await this.ensureTable();
    const fnKey = normalizeFunctionLabel(recipientFunction);
    const uid = String(currentUserId ?? '').trim();
    const readClause = unreadOnly ? ' AND n.[seen] = 0' : '';
    const fetchCap = Math.min(500, Math.max(limit * 5, limit + 20));

    const typeClause = `(n.[type] = @param0 OR n.[type] = N'ICR')`;

    let rows: Record<string, unknown>[] | null;
    if (uid) {
      rows = await this.db.query(
        `SELECT TOP (${fetchCap}) n.[id], n.[message], n.[fromId], n.[toId], n.[type], n.[actionId], n.[seen], n.[createdAt], n.[updatedAt]
         FROM dbo.Notifications n
         WHERE ${typeClause}
           AND n.[deletedAt] IS NULL
           AND (n.[toId] IS NULL OR LOWER(LTRIM(RTRIM(CAST(n.[toId] AS NVARCHAR(36))))) = LOWER(LTRIM(RTRIM(@param1))))
           ${readClause}
         ORDER BY n.[createdAt] DESC`,
        [ICR_NOTIFICATION_TYPE, uid],
      );
    } else {
      rows = await this.db.query(
        `SELECT TOP (${fetchCap}) n.[id], n.[message], n.[fromId], n.[toId], n.[type], n.[actionId], n.[seen], n.[createdAt], n.[updatedAt]
         FROM dbo.Notifications n
         WHERE ${typeClause}
           AND n.[deletedAt] IS NULL
           AND n.[toId] IS NULL
           ${readClause}
         ORDER BY n.[createdAt] DESC`,
        [ICR_NOTIFICATION_TYPE],
      );
    }

    const mapped = (rows ?? []).map((r) => this.mapNotificationsTableRow(r));
    const filtered = mapped.filter((n) => normalizeFunctionLabel(n.recipientFunction) === fnKey);
    return filtered.slice(0, limit);
  }

  async getNotificationsForReport(reportId: number): Promise<IcrNotification[]> {
    await this.ensureTable();
    const rows = await this.db.query(
      `SELECT n.[id], n.[message], n.[fromId], n.[toId], n.[type], n.[actionId], n.[seen], n.[createdAt], n.[updatedAt]
       FROM dbo.Notifications n
       WHERE (n.[type] = @param0 OR n.[type] = N'ICR')
         AND n.[deletedAt] IS NULL
         AND (
           TRY_CAST(LEFT(n.[actionId], NULLIF(CHARINDEX('/', n.[actionId]), 0) - 1) AS INT) = @param1
           OR TRY_CAST(JSON_VALUE(n.[actionId], N'$.r') AS INT) = @param1
         )
       ORDER BY n.[createdAt] DESC`,
      [ICR_NOTIFICATION_TYPE, reportId],
    );
    return (rows ?? []).map((r) => this.mapNotificationsTableRow(r));
  }

  async markRead(notificationIds: string[], currentUserId: string): Promise<void> {
    if (!notificationIds.length) return;
    const placeholders = notificationIds.map((_, i) => `@param${i + 1}`).join(',');
    const uid = String(currentUserId ?? '').trim();
    const params: unknown[] = [uid, ...notificationIds];
    await this.db.query(
      `UPDATE dbo.Notifications
       SET [seen] = 1, [updatedAt] = SYSDATETIMEOFFSET()
       WHERE ([type] = N'ICR Section' OR [type] = N'ICR')
         AND [id] IN (${placeholders})
         AND (
           [toId] IS NULL
           OR LOWER(LTRIM(RTRIM(CAST([toId] AS NVARCHAR(36))))) = LOWER(LTRIM(RTRIM(@param0)))
         )`,
      [uid, ...notificationIds],
    );
  }
}