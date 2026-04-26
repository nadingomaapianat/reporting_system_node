import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  IcrSectionRecord,
  IcrSectionStatus,
  IcrSectionType,
  SectionWorkflowEntry,
} from '../interfaces/icr-section.types';
import { IcrStatus } from '../interfaces/icr-report.types';
import { IcrReportUser } from '../decorators/current-user.decorator';
import { IcrNotificationService } from './icr-notification.service';

function parseJsonColumn<T>(raw: any, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const ALLOWED_SECTION_TRANSITIONS: Record<IcrSectionStatus, IcrSectionStatus[]> = {
  [IcrSectionStatus.PENDING]:      [IcrSectionStatus.GENERATED],
  [IcrSectionStatus.GENERATED]:    [IcrSectionStatus.SUBMITTED],
  [IcrSectionStatus.SUBMITTED]:    [IcrSectionStatus.UNDER_REVIEW, IcrSectionStatus.GENERATED],
  [IcrSectionStatus.UNDER_REVIEW]: [IcrSectionStatus.APPROVED, IcrSectionStatus.REJECTED],
  [IcrSectionStatus.APPROVED]:     [IcrSectionStatus.LOCKED],
  [IcrSectionStatus.REJECTED]:     [IcrSectionStatus.GENERATED],
  [IcrSectionStatus.REVIEWED]:     [IcrSectionStatus.SUBMITTED, IcrSectionStatus.LOCKED],
  [IcrSectionStatus.LOCKED]:       [],
};

@Injectable()
export class IcrWorkflowService {
  private readonly logger = new Logger(IcrWorkflowService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: IcrNotificationService,
  ) {}

  private async resolveReportTitle(reportId: number): Promise<string> {
    const rr = await this.db.query(`SELECT title FROM dbo.icr_reports WHERE id = @param0`, [reportId]);
    return (rr?.[0]?.title as string) ?? `Report #${reportId}`;
  }

  async submitForReview(
    reportId: number,
    sectionType: IcrSectionType,
    user: IcrReportUser,
    notes?: string,
  ): Promise<IcrSectionRecord> {
    const section = await this.loadSection(reportId, sectionType);
    this.assertNotLocked(section);
    this.assertCanTransition(section.sectionStatus, IcrSectionStatus.SUBMITTED);

    const entry = this.buildEntry('SUBMITTED', user, section.sectionStatus, IcrSectionStatus.SUBMITTED, notes);
    const history = [...(section.workflowHistory ?? []), entry];

    await this.db.query(
      `UPDATE dbo.icr_sections
       SET sectionStatus = @param0,
           workflowHistory = @param1,
           updatedById = @param2, updatedByName = @param3,
           version = version + 1, updatedAt = GETUTCDATE()
       WHERE id = @param4`,
      [IcrSectionStatus.SUBMITTED, JSON.stringify(history), user.id, user.fullName, section.id],
    );

    this.logger.log(`[ICR-WF] Section "${sectionType}" in Report #${reportId} submitted by ${user.fullName}`);

    const makerFn = String(section.ownership?.makerFunction ?? '').trim();
    if (makerFn) {
      try {
        const reportTitle = await this.resolveReportTitle(reportId);
        await this.notifications.notifySubmittedForReview({
          reportId,
          reportTitle,
          sectionType,
          sectionTitle: section.title,
          makerFunction: makerFn,
          submittedByName: user.fullName,
          submittedById: user.id,
        });
      } catch (err) {
        this.logger.warn(`[ICR-WF] Submit notification failed: ${(err as Error).message}`);
      }
    }

    return this.loadSection(reportId, sectionType);
  }

  async beginReview(
    reportId: number,
    sectionType: IcrSectionType,
    user: IcrReportUser,
  ): Promise<IcrSectionRecord> {
    const section = await this.loadSection(reportId, sectionType);
    this.assertNotLocked(section);
    this.assertCanTransition(section.sectionStatus, IcrSectionStatus.UNDER_REVIEW);

    const entry = this.buildEntry('UNDER_REVIEW', user, section.sectionStatus, IcrSectionStatus.UNDER_REVIEW);
    const history = [...(section.workflowHistory ?? []), entry];

    await this.db.query(
      `UPDATE dbo.icr_sections
       SET sectionStatus = @param0,
           workflowHistory = @param1,
           updatedById = @param2, updatedByName = @param3,
           version = version + 1, updatedAt = GETUTCDATE()
       WHERE id = @param4`,
      [IcrSectionStatus.UNDER_REVIEW, JSON.stringify(history), user.id, user.fullName, section.id],
    );

    this.logger.log(`[ICR-WF] Section "${sectionType}" in Report #${reportId} under review by ${user.fullName}`);
    return this.loadSection(reportId, sectionType);
  }

  async approveSection(
    reportId: number,
    sectionType: IcrSectionType,
    user: IcrReportUser,
    notes?: string,
  ): Promise<IcrSectionRecord> {
    const section = await this.loadSection(reportId, sectionType);
    this.assertNotLocked(section);
    this.assertCanTransition(section.sectionStatus, IcrSectionStatus.APPROVED);

    const entry = this.buildEntry('APPROVED', user, section.sectionStatus, IcrSectionStatus.APPROVED, notes);
    const history = [...(section.workflowHistory ?? []), entry];

    await this.db.query(
      `UPDATE dbo.icr_sections
       SET sectionStatus = @param0,
           rejectionReason = NULL,
           reviewerNotes = @param1,
           workflowHistory = @param2,
           updatedById = @param3, updatedByName = @param4,
           version = version + 1, updatedAt = GETUTCDATE()
       WHERE id = @param5`,
      [IcrSectionStatus.APPROVED, notes ?? section.reviewerNotes, JSON.stringify(history), user.id, user.fullName, section.id],
    );

    this.logger.log(`[ICR-WF] Section "${sectionType}" in Report #${reportId} approved by ${user.fullName}`);

    const makerFnApprove = String(section.ownership?.makerFunction ?? '').trim();
    if (makerFnApprove) {
      try {
        const reportTitle = await this.resolveReportTitle(reportId);
        await this.notifications.notifySectionApproved({
          reportId,
          reportTitle,
          sectionType,
          sectionTitle: section.title,
          makerFunction: makerFnApprove,
          approvedByName: user.fullName,
          approvedById: user.id,
        });
      } catch (err) {
        this.logger.warn(`[ICR-WF] Approve notification failed: ${(err as Error).message}`);
      }
    }

    return this.loadSection(reportId, sectionType);
  }

  async rejectSection(
    reportId: number,
    sectionType: IcrSectionType,
    user: IcrReportUser,
    reason: string,
  ): Promise<IcrSectionRecord> {
    if (!reason?.trim()) {
      throw new BadRequestException('Rejection reason is required.');
    }

    const section = await this.loadSection(reportId, sectionType);
    this.assertNotLocked(section);
    this.assertCanTransition(section.sectionStatus, IcrSectionStatus.REJECTED);

    const entry = this.buildEntry('REJECTED', user, section.sectionStatus, IcrSectionStatus.REJECTED, reason);
    const history = [...(section.workflowHistory ?? []), entry];

    await this.db.query(
      `UPDATE dbo.icr_sections
       SET sectionStatus = @param0,
           rejectionReason = @param1,
           workflowHistory = @param2,
           updatedById = @param3, updatedByName = @param4,
           version = version + 1, updatedAt = GETUTCDATE()
       WHERE id = @param5`,
      [IcrSectionStatus.REJECTED, reason, JSON.stringify(history), user.id, user.fullName, section.id],
    );

    this.logger.log(`[ICR-WF] Section "${sectionType}" in Report #${reportId} rejected by ${user.fullName}`);

    const makerFnReject = String(section.ownership?.makerFunction ?? '').trim();
    if (makerFnReject) {
      try {
        const reportTitle = await this.resolveReportTitle(reportId);
        await this.notifications.notifySectionRejected({
          reportId,
          reportTitle,
          sectionType,
          sectionTitle: section.title,
          makerFunction: makerFnReject,
          rejectedByName: user.fullName,
          rejectedById: user.id,
          reason,
        });
      } catch (err) {
        this.logger.warn(`[ICR-WF] Reject notification failed: ${(err as Error).message}`);
      }
    }

    return this.loadSection(reportId, sectionType);
  }

  async recallSection(
    reportId: number,
    sectionType: IcrSectionType,
    user: IcrReportUser,
    notes?: string,
  ): Promise<IcrSectionRecord> {
    const section = await this.loadSection(reportId, sectionType);
    this.assertNotLocked(section);

    if (section.sectionStatus !== IcrSectionStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted sections can be recalled.');
    }

    const entry = this.buildEntry('EDITED', user, section.sectionStatus, IcrSectionStatus.GENERATED, notes ?? 'Section recalled by maker');
    const history = [...(section.workflowHistory ?? []), entry];

    await this.db.query(
      `UPDATE dbo.icr_sections
       SET sectionStatus = @param0,
           workflowHistory = @param1,
           updatedById = @param2, updatedByName = @param3,
           version = version + 1, updatedAt = GETUTCDATE()
       WHERE id = @param4`,
      [IcrSectionStatus.GENERATED, JSON.stringify(history), user.id, user.fullName, section.id],
    );

    return this.loadSection(reportId, sectionType);
  }

  async lockAllSections(reportId: number, user: IcrReportUser): Promise<void> {
    const rows = await this.db.query(
      `SELECT id, sectionStatus, workflowHistory FROM dbo.icr_sections WHERE icrReportId = @param0`,
      [reportId],
    );

    for (const row of rows ?? []) {
      if (row.sectionStatus === IcrSectionStatus.LOCKED) continue;
      const existing = parseJsonColumn<SectionWorkflowEntry[]>(row.workflowHistory, []);
      const entry = this.buildEntry('LOCKED', user, row.sectionStatus as IcrSectionStatus, IcrSectionStatus.LOCKED, 'Report approved — all sections locked');
      const history = [...existing, entry];

      await this.db.query(
        `UPDATE dbo.icr_sections
         SET sectionStatus = @param0,
             workflowHistory = @param1,
             updatedById = @param2, updatedByName = @param3,
             updatedAt = GETUTCDATE()
         WHERE id = @param4`,
        [IcrSectionStatus.LOCKED, JSON.stringify(history), user.id, user.fullName, row.id],
      );
    }

    this.logger.log(`[ICR-WF] All sections locked for Report #${reportId}`);
  }

  async getWorkflowSummary(reportId: number): Promise<{
    totalSections: number;
    generated: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    locked: number;
    pendingApproval: string[];
    readyToApprove: boolean;
  }> {
    const rows = await this.db.query(
      `SELECT sectionType, title, sectionStatus FROM dbo.icr_sections
       WHERE icrReportId = @param0 AND isVisible = 1`,
      [reportId],
    );

    const counts = { generated: 0, submitted: 0, underReview: 0, approved: 0, rejected: 0, locked: 0 };
    const pendingApproval: string[] = [];

    for (const r of rows ?? []) {
      switch (r.sectionStatus) {
        case IcrSectionStatus.APPROVED: counts.approved++; break;
        case IcrSectionStatus.UNDER_REVIEW: counts.underReview++; pendingApproval.push(r.title); break;
        case IcrSectionStatus.SUBMITTED: counts.submitted++; pendingApproval.push(r.title); break;
        case IcrSectionStatus.GENERATED: counts.generated++; pendingApproval.push(r.title); break;
        case IcrSectionStatus.REJECTED: counts.rejected++; pendingApproval.push(r.title); break;
        case IcrSectionStatus.LOCKED: counts.locked++; break;
      }
    }

    const total = (rows ?? []).length;
    return {
      totalSections: total,
      ...counts,
      pendingApproval,
      readyToApprove: counts.approved === total || counts.locked === total,
    };
  }

  private async loadSection(reportId: number, sectionType: IcrSectionType): Promise<IcrSectionRecord> {
    const rows = await this.db.query(
      `SELECT id, icrReportId, sectionType, title, sortOrder, content,
              contentType, sectionStatus, isVisible, reviewerNotes, rejectionReason,
              sectionOwner, sectionOwnerInitials, ownership, workflowHistory,
              version, lastRegeneratedAt, createdAt, updatedAt,
              createdById, createdByName, updatedById, updatedByName
       FROM dbo.icr_sections
       WHERE icrReportId = @param0 AND sectionType = @param1`,
      [reportId, sectionType],
    );

    if (!rows?.length) {
      throw new NotFoundException(`Section "${sectionType}" not found in Report #${reportId}.`);
    }

    const row = rows[0];
    return {
      ...row,
      content: parseJsonColumn(row.content, {}),
      ownership: parseJsonColumn(row.ownership, null),
      workflowHistory: parseJsonColumn<SectionWorkflowEntry[]>(row.workflowHistory, []),
      isVisible: row.isVisible === true || row.isVisible === 1,
    } as IcrSectionRecord;
  }

  private assertNotLocked(section: IcrSectionRecord): void {
    if (section.sectionStatus === IcrSectionStatus.LOCKED) {
      throw new ForbiddenException('This section is locked and cannot be modified.');
    }
  }

  private assertCanTransition(from: IcrSectionStatus, to: IcrSectionStatus): void {
    const allowed = ALLOWED_SECTION_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Cannot transition section from "${from}" to "${to}".`);
    }
  }

  private buildEntry(
    action: SectionWorkflowEntry['action'],
    user: IcrReportUser,
    fromStatus: IcrSectionStatus,
    toStatus: IcrSectionStatus,
    notes?: string,
  ): SectionWorkflowEntry {
    return {
      action,
      userId: user.id,
      userName: user.fullName,
      timestamp: new Date().toISOString(),
      notes,
      fromStatus,
      toStatus,
    };
  }
}
