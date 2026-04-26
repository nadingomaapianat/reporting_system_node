import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  HttpException,
  OnModuleInit,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import {
  IcrReportRecord,
  IcrStatus,
  IcrOverallRating,
  IcrApprovalChain,
  IcrAuditTrailEntry,
} from '../interfaces/icr-report.types';
import {
  IcrSectionRecord,
  IcrSectionStatus,
  IcrSectionType,
  IcrContentType,
  DEFAULT_SECTION_OWNERS,
  SECTION_OWNERSHIP_MAP,
  SECTION_CONTENT_TYPE_MAP,
  SectionOwnership,
  SectionWorkflowEntry,
} from '../interfaces/icr-section.types';
import { IcrDataAggregatorService } from './icr-data-aggregator.service';
import { IcrTemplateEngineService } from './icr-template-engine.service';
import { IcrReportUser } from '../decorators/current-user.decorator';
import { IcrRole, userHasFullIcrAccess } from '../guards/icr.guards';
import { CreateIcrReportDto, UpdateIcrStatusDto } from '../dto/icr.dto';
import { getEditableKeysForSection } from '../constants/icr-section-editable';
import { IcrTemplateAdminService, type SectionConfigRow } from './icr-template-admin.service';
import { IcrNotificationService } from './icr-notification.service';

import type { AggregationScope, SectionOutput } from './interfaces/icr.interfaces';

export interface RegenerateSectionDto {
  sectionType: IcrSectionType;
}

export interface IcrTaskSectionRecord {
  sectionType: IcrSectionType;
  title: string;
  sortOrder: number;
  sectionStatus: IcrSectionStatus;
  contentType: IcrContentType;
  sectionOwner: string | null;
  sectionOwnerInitials: string | null;
  ownership: SectionOwnership | null;
  matchedRole: 'maker' | 'checker' | 'both' | 'admin';
  canSave: boolean;
  canSubmit: boolean;
  canBeginReview: boolean;
  canApprove: boolean;
  canReject: boolean;
}

export interface IcrTaskReportRecord {
  id: number;
  title: string;
  reportingPeriod: string;
  framework: IcrReportRecord['framework'];
  businessUnit: string | null;
  status: IcrStatus;
  /** Template used by this report (for Tasks UI: filter by template). */
  templateId: number | null;
  sections: IcrTaskSectionRecord[];
}

interface SectionConfigRecord {
  sectionType: string;
  titleAr: string;
  titleEn: string;
  sortOrder: number;
  contentType: string;
  ownership: { makerFunction?: string; checkerFunction?: string } | null;
  placeholders: string[];
}

/**
 * Arabic keyword → engine section mapping.
 * Used to match each template config to the engine section
 * that provides its content. Multiple configs can share one engine section.
 */
const ARABIC_KEYWORD_TO_ENGINE: Array<{ kw: string; engine: IcrSectionType }> = [
  { kw: 'مقدمة',           engine: IcrSectionType.INTRODUCTION },
  { kw: 'قرار',            engine: IcrSectionType.INTRODUCTION },
  { kw: 'خطوط الأعمال',    engine: IcrSectionType.INTRODUCTION },
  { kw: 'الهيكل التنظيم',  engine: IcrSectionType.INTRODUCTION },
  { kw: 'نطاق',            engine: IcrSectionType.SCOPE_AND_METHODOLOGY },
  { kw: 'منهجية',          engine: IcrSectionType.SCOPE_AND_METHODOLOGY },
  { kw: 'خطوات',           engine: IcrSectionType.SCOPE_AND_METHODOLOGY },
  { kw: 'COSO',            engine: IcrSectionType.COSO_OVERVIEW },
  { kw: 'بيئة الرقابة',    engine: IcrSectionType.COSO_OVERVIEW },
  { kw: 'تقييم المخاطر',   engine: IcrSectionType.RISK_ASSESSMENT },
  { kw: 'المخاطر الرئيسية', engine: IcrSectionType.RISK_ASSESSMENT },
  { kw: 'مخاطر',           engine: IcrSectionType.RISK_ASSESSMENT },
  { kw: 'أنشطة الرقابة',   engine: IcrSectionType.CONTROL_ACTIVITIES },
  { kw: 'الضوابط الرقابية', engine: IcrSectionType.CONTROL_ACTIVITIES },
  { kw: 'ضوابط',           engine: IcrSectionType.CONTROL_ACTIVITIES },
  { kw: 'قطاعات الرقابة',  engine: IcrSectionType.CONTROL_ACTIVITIES },
  { kw: 'العمليات الهامة',  engine: IcrSectionType.RCM },
  { kw: 'العمليات',        engine: IcrSectionType.RCM },
  { kw: 'RCM',             engine: IcrSectionType.RCM },
  { kw: 'إحصائيات',        engine: IcrSectionType.FINDINGS },
  { kw: 'ملاحظات',         engine: IcrSectionType.FINDINGS },
  { kw: 'نتائج',           engine: IcrSectionType.FINDINGS },
  { kw: 'خطط الإجراءات',   engine: IcrSectionType.ACTION_PLANS },
  { kw: 'إجراءات',         engine: IcrSectionType.ACTION_PLANS },
  { kw: 'الأنشطة الرئيسية', engine: IcrSectionType.ACTION_PLANS },
  { kw: 'مؤشرات',          engine: IcrSectionType.KRI_DASHBOARD },
  { kw: 'KRI',             engine: IcrSectionType.KRI_DASHBOARD },
  { kw: 'خاتمة',           engine: IcrSectionType.CONCLUSION },
  { kw: 'توصيات',          engine: IcrSectionType.CONCLUSION },
  { kw: 'ملحق',            engine: IcrSectionType.APPENDIX },
];

/**
 * For a single config's Arabic title, find the matching engine section type.
 */
function matchConfigToEngine(titleAr: string): IcrSectionType | null {
  if (!titleAr) return null;
  for (const { kw, engine } of ARABIC_KEYWORD_TO_ENGINE) {
    if (titleAr.includes(kw)) return engine;
  }
  return null;
}

/**
 * Extract clean placeholder key from raw tag like `{{some_name}}`.
 */
function extractPlaceholderKey(raw: string): string {
  return raw.replace(/[{}\s%]/g, '').trim();
}

/**
 * Build sections from template configs, filling content from engine.
 * - Word `{{placeholders}}`: dynamic tag fields + optional engine merge.
 * - No placeholders: fixed template shell (`_static: true`).
 *
 * NOTE:
 * We intentionally do NOT auto-inject engine content based only on Arabic title keyword matches.
 * This keeps template-based reports user-driven: data appears when mapped/configured by the user.
 */
function buildSectionsFromConfigs(
  configs: SectionConfigRecord[],
  engineSections: SectionOutput[],
): SectionOutput[] {
  const engineMap = new Map(engineSections.map(s => [s.sectionType, s]));

  return configs.map((cfg, idx) => {
    const engineKey = matchConfigToEngine(cfg.titleAr);
    const engineSec = engineKey ? engineMap.get(engineKey) : null;

    const tags = (cfg.placeholders ?? []).filter(p => p.startsWith('{{'));
    const hasWordPlaceholders = tags.length > 0;

    let content: Record<string, unknown>;

    if (hasWordPlaceholders) {
      const fields: Record<string, unknown> = {};
      for (const tag of tags) {
        const key = extractPlaceholderKey(tag);
        if (key) fields[key] = '';
      }
      content = {
        _static: false,
        _placeholderKeys: tags.map(extractPlaceholderKey).filter(Boolean),
        ...fields,
        ...(engineSec?.content ?? {}),
      };
    } else {
      content = {
        _static: true,
      };
    }

    return {
      sectionType: cfg.sectionType,
      title: cfg.titleAr || cfg.titleEn || cfg.sectionType,
      sortOrder: cfg.sortOrder ?? (idx + 1),
      content,
    };
  });
}

const ALLOWED_TRANSITIONS: Record<IcrStatus, IcrStatus[]> = {
  [IcrStatus.DRAFT]: [IcrStatus.IN_REVIEW, IcrStatus.ARCHIVED],
  [IcrStatus.IN_REVIEW]: [IcrStatus.APPROVED, IcrStatus.DRAFT],
  [IcrStatus.APPROVED]: [IcrStatus.PUBLISHED, IcrStatus.IN_REVIEW],
  [IcrStatus.PUBLISHED]: [IcrStatus.ARCHIVED],
  [IcrStatus.ARCHIVED]: [],
};

const LOCKED_STATUSES: IcrStatus[] = [IcrStatus.APPROVED, IcrStatus.PUBLISHED];

function buildAuditEntry(
  action: string,
  user: { id: string; fullName: string },
  options?: {
    fromStatus?: IcrStatus;
    toStatus?: IcrStatus;
    notes?: string;
  },
): IcrAuditTrailEntry {
  return {
    action,
    performedBy: user.fullName,
    performedAt: new Date().toISOString(),
    fromStatus: options?.fromStatus,
    toStatus: options?.toStatus,
    notes: options?.notes,
  };
}

function parseJsonColumn<T>(raw: any, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw as T;
  try { return JSON.parse(raw) as T; }
  catch { return fallback; }
}

function mapReportRow(row: any): IcrReportRecord {
  return {
    id: row.id,
    title: row.title,
    reportingPeriod: row.reportingPeriod,
    periodFrom: row.periodFrom ? new Date(row.periodFrom).toISOString() : '',
    periodTo: row.periodTo ? new Date(row.periodTo).toISOString() : '',
    framework: row.framework,
    reportMode: row.reportMode ?? null,
    businessUnit: row.businessUnit ?? null,
    division: row.division ?? null,
    templateId: row.templateId ?? null,
    status: row.status,
    overallRating: row.overallRating ?? null,
    approvalChain: parseJsonColumn<IcrApprovalChain | null>(row.approvalChain, null),
    scopeFilters: parseJsonColumn(row.scopeFilters, null),
    reportSnapshot: parseJsonColumn(row.reportSnapshot, null),
    version: row.version,
    lastRegeneratedAt: row.lastRegeneratedAt ? new Date(row.lastRegeneratedAt).toISOString() : null,
    lastRegeneratedBy: row.resolvedCreatorName ?? row.lastRegeneratedBy ?? null,
    auditTrail: parseJsonColumn<IcrAuditTrailEntry[]>(row.auditTrail, []),
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : '',
    createdById: row.createdById,
    createdByName: row.resolvedCreatorName ?? row.createdByName,
    updatedById: row.updatedById ?? null,
    updatedByName: row.resolvedUpdaterName ?? row.updatedByName ?? null,
  };
}

function mapSectionRow(row: any): IcrSectionRecord {
  const sectionType = row.sectionType as IcrSectionType;
  const defaultOwner = DEFAULT_SECTION_OWNERS[sectionType];
  const defaultOwnership = SECTION_OWNERSHIP_MAP[sectionType] ?? null;
  return {
    id: row.id,
    icrReportId: row.icrReportId,
    sectionType,
    title: row.title,
    sortOrder: row.sortOrder,
    content: parseJsonColumn(row.content, {}),
    contentType: (row.contentType as IcrContentType) ?? SECTION_CONTENT_TYPE_MAP[sectionType] ?? IcrContentType.DYNAMIC,
    sectionStatus: row.sectionStatus,
    isVisible: row.isVisible === true || row.isVisible === 1,
    reviewerNotes: row.reviewerNotes ?? null,
    rejectionReason: row.rejectionReason ?? null,
    sectionOwner: row.sectionOwner ?? defaultOwner?.label ?? null,
    sectionOwnerInitials: row.sectionOwnerInitials ?? defaultOwner?.initials ?? null,
    ownership: parseJsonColumn<SectionOwnership | null>(row.ownership, defaultOwnership),
    workflowHistory: parseJsonColumn<SectionWorkflowEntry[]>(row.workflowHistory, []),
    version: row.version,
    lastRegeneratedAt: row.lastRegeneratedAt ? new Date(row.lastRegeneratedAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : '',
    createdById: row.createdById,
    createdByName: row.resolvedCreatorName ?? row.createdByName,
    updatedById: row.updatedById ?? null,
    updatedByName: row.resolvedUpdaterName ?? row.updatedByName ?? null,
  };
}

@Injectable()
export class IcrService implements OnModuleInit {
  private readonly logger = new Logger(IcrService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly aggregator: IcrDataAggregatorService,
    private readonly templateEngine: IcrTemplateEngineService,
    private readonly templateAdmin: IcrTemplateAdminService,
    private readonly notifications: IcrNotificationService,
  ) {}

  private async loadSectionConfigs(templateId: number | null): Promise<SectionConfigRecord[]> {
    let tid = templateId;
    if (!tid) {
      const defRows = await this.db.query(
        `SELECT TOP 1 id FROM dbo.icr_templates WHERE isDefault = 1 AND isActive = 1`,
        [],
      );
      tid = defRows?.[0]?.id ?? null;
    }
    if (!tid) return [];

    const rows = await this.db.query(
      `SELECT * FROM dbo.icr_section_configs
       WHERE templateId = @param0 AND isEnabled = 1
       ORDER BY sortOrder ASC`,
      [tid],
    );
    return (rows ?? []).map((r: any) => ({
      sectionType: r.sectionType,
      titleAr: r.titleAr,
      titleEn: r.titleEn,
      sortOrder: r.sortOrder,
      contentType: r.contentType,
      ownership: parseJsonColumn(r.ownership, null),
      placeholders: parseJsonColumn<string[]>(r.placeholders, []),
    }));
  }

  async onModuleInit(): Promise<void> {
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.ensureSchema();
        return;
      } catch (err: any) {
        if (i < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        } else {
          this.logger.error(`[ICR] Schema init failed after ${maxRetries} attempts: ${err.message}`);
        }
      }
    }
  }

  private async ensureSchema(): Promise<void> {
    const pool = await this.db.getConnection();
    const run = (s: string) => new sql.Request(pool).query(s);

    const addCol = async (table: string, col: string, type: string) => {
      try {
        await run(`
          IF NOT EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('dbo.${table}') AND name = '${col}'
          )
          ALTER TABLE dbo.${table} ADD ${col} ${type}
        `);
      } catch {
        /* column may already exist */
      }
    };

    try {
      const existsCheck = await run(`
        SELECT CASE WHEN OBJECT_ID('dbo.icr_reports', 'U') IS NOT NULL THEN 1 ELSE 0 END AS ex
      `);
      const reportsExist = existsCheck.recordset?.[0]?.ex === 1;

      if (!reportsExist) {
        await run(`
          CREATE TABLE dbo.icr_reports (
            id                  INT IDENTITY(1,1) PRIMARY KEY,
            title               NVARCHAR(300)     NOT NULL,
            reportingPeriod     NVARCHAR(100)     NOT NULL,
            periodFrom          DATE              NOT NULL,
            periodTo            DATE              NOT NULL,
            framework           NVARCHAR(50)      NOT NULL DEFAULT 'COSO',
            reportMode          NVARCHAR(50)      NULL,
            businessUnit        NVARCHAR(200)     NULL,
            division            NVARCHAR(200)     NULL,
            status              NVARCHAR(50)      NOT NULL DEFAULT 'DRAFT',
            overallRating       NVARCHAR(50)      NULL,
            approvalChain       NVARCHAR(MAX)     NULL,
            scopeFilters        NVARCHAR(MAX)     NULL,
            reportSnapshot      NVARCHAR(MAX)     NULL,
            version             INT               NOT NULL DEFAULT 1,
            lastRegeneratedAt   DATETIME          NULL,
            lastRegeneratedBy   NVARCHAR(200)     NULL,
            auditTrail          NVARCHAR(MAX)     NULL,
            createdById         UNIQUEIDENTIFIER  NULL,
            createdByName       NVARCHAR(200)     NULL,
            updatedById         UNIQUEIDENTIFIER  NULL,
            updatedByName       NVARCHAR(200)     NULL,
            createdAt           DATETIME          NOT NULL DEFAULT GETUTCDATE(),
            updatedAt           DATETIME          NOT NULL DEFAULT GETUTCDATE()
          )
        `);

        await run(`
          CREATE TABLE dbo.icr_sections (
            id                      INT IDENTITY(1,1) PRIMARY KEY,
            icrReportId             INT               NOT NULL,
            sectionType             NVARCHAR(60)      NOT NULL,
            title                   NVARCHAR(300)     NOT NULL,
            sortOrder               INT               NOT NULL DEFAULT 0,
            content                 NVARCHAR(MAX)     NULL,
            contentType             NVARCHAR(20)      NOT NULL DEFAULT 'DYNAMIC',
            sectionStatus           NVARCHAR(50)      NOT NULL DEFAULT 'GENERATED',
            isVisible               BIT               NOT NULL DEFAULT 1,
            reviewerNotes           NVARCHAR(MAX)     NULL,
            rejectionReason         NVARCHAR(MAX)     NULL,
            sectionOwner            NVARCHAR(200)     NULL,
            sectionOwnerInitials    NVARCHAR(10)      NULL,
            ownership               NVARCHAR(MAX)     NULL,
            workflowHistory         NVARCHAR(MAX)     NULL,
            version                 INT               NOT NULL DEFAULT 1,
            lastRegeneratedAt       DATETIME          NULL,
            createdById             UNIQUEIDENTIFIER  NULL,
            createdByName           NVARCHAR(200)     NULL,
            updatedById             UNIQUEIDENTIFIER  NULL,
            updatedByName           NVARCHAR(200)     NULL,
            createdAt               DATETIME          NOT NULL DEFAULT GETUTCDATE(),
            updatedAt               DATETIME          NOT NULL DEFAULT GETUTCDATE(),
            FOREIGN KEY (icrReportId) REFERENCES dbo.icr_reports(id)
          )
        `);
      } else {
        await addCol('icr_reports', 'reportMode', 'NVARCHAR(50) NULL');
        await addCol('icr_sections', 'sectionOwner', 'NVARCHAR(200) NULL');
        await addCol('icr_sections', 'sectionOwnerInitials', 'NVARCHAR(10) NULL');
        await addCol('icr_sections', 'contentType', "NVARCHAR(20) NOT NULL DEFAULT 'DYNAMIC'");
        await addCol('icr_sections', 'ownership', 'NVARCHAR(MAX) NULL');
        await addCol('icr_sections', 'rejectionReason', 'NVARCHAR(MAX) NULL');
        await addCol('icr_sections', 'workflowHistory', 'NVARCHAR(MAX) NULL');
      }

      await run(`
        IF OBJECT_ID('dbo.icr_default_sections', 'U') IS NULL
        CREATE TABLE dbo.icr_default_sections (
          sectionType      NVARCHAR(60)     NOT NULL PRIMARY KEY,
          content          NVARCHAR(MAX)    NOT NULL CONSTRAINT DF_icr_default_sections_content DEFAULT('{}'),
          updatedByName    NVARCHAR(200)    NULL,
          updatedById      UNIQUEIDENTIFIER NULL,
          createdAt        DATETIME         NOT NULL DEFAULT GETUTCDATE(),
          updatedAt        DATETIME         NOT NULL DEFAULT GETUTCDATE()
        )
      `);

      await run(`
        IF OBJECT_ID('dbo.icr_templates', 'U') IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'icr_templates' AND COLUMN_NAME = 'id'
          )
        BEGIN
          IF OBJECT_ID('dbo.icr_section_configs', 'U') IS NOT NULL
            DROP TABLE dbo.icr_section_configs;
          DROP TABLE dbo.icr_templates;
        END
      `);

      await run(`
        IF OBJECT_ID('dbo.icr_templates', 'U') IS NULL
        CREATE TABLE dbo.icr_templates (
          id               INT IDENTITY(1,1) PRIMARY KEY,
          name             NVARCHAR(255)     NOT NULL,
          description      NVARCHAR(MAX)     NULL,
          sourceFilename   NVARCHAR(500)     NULL,
          isDefault        BIT               NOT NULL DEFAULT 0,
          isActive         BIT               NOT NULL DEFAULT 1,
          createdByName    NVARCHAR(200)     NULL,
          createdById      NVARCHAR(200)     NULL,
          createdAt        DATETIME          NOT NULL DEFAULT GETUTCDATE(),
          updatedAt        DATETIME          NOT NULL DEFAULT GETUTCDATE()
        )
      `);

      await run(`
        IF OBJECT_ID('dbo.icr_section_configs', 'U') IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'icr_section_configs' AND COLUMN_NAME = 'id'
          )
        DROP TABLE dbo.icr_section_configs
      `);

      await run(`
        IF OBJECT_ID('dbo.icr_section_configs', 'U') IS NULL
        CREATE TABLE dbo.icr_section_configs (
          id               INT IDENTITY(1,1) PRIMARY KEY,
          templateId       INT              NOT NULL,
          sectionType      NVARCHAR(80)     NOT NULL,
          titleAr          NVARCHAR(500)    NOT NULL,
          titleEn          NVARCHAR(200)    NOT NULL DEFAULT '',
          sortOrder        INT              NOT NULL DEFAULT 99,
          paraIndex        INT              NULL,
          contentType      NVARCHAR(20)     NOT NULL DEFAULT 'LOCKED',
          isEnabled        BIT              NOT NULL DEFAULT 1,
          ownership        NVARCHAR(MAX)    NULL,
          editableFields   NVARCHAR(MAX)    NULL DEFAULT '[]',
          tables           NVARCHAR(MAX)    NULL DEFAULT '[]',
          placeholders     NVARCHAR(MAX)    NULL DEFAULT '[]',
          sourceFilename   NVARCHAR(500)    NULL,
          createdAt        DATETIME         NOT NULL DEFAULT GETUTCDATE(),
          updatedAt        DATETIME         NOT NULL DEFAULT GETUTCDATE(),
          FOREIGN KEY (templateId) REFERENCES dbo.icr_templates(id)
        )
      `);

      await addCol('icr_section_configs', 'templateId', 'INT NULL');
      await addCol('icr_section_configs', 'rawContent', 'NVARCHAR(MAX) NULL');
      await addCol('icr_reports', 'templateId', 'INT NULL');
      await addCol('icr_templates', 'filePath', 'NVARCHAR(1000) NULL');
      await addCol('icr_tag_configs', 'chartId', 'INT NULL');
      await addCol('icr_tag_configs', 'chartUseChart', 'BIT NULL');
      await addCol('icr_tag_configs', 'chartUseTable', 'BIT NULL');

      await run(`
        IF OBJECT_ID('dbo.icr_tag_configs', 'U') IS NULL
        CREATE TABLE dbo.icr_tag_configs (
          id              INT IDENTITY(1,1) PRIMARY KEY,
          icrSectionId    INT               NOT NULL,
          tagKey          NVARCHAR(200)     NOT NULL,
          sourceType      NVARCHAR(20)      NOT NULL DEFAULT 'empty',
          dataType        NVARCHAR(20)      NULL,
          userValue       NVARCHAR(MAX)     NULL,
          dbTable         NVARCHAR(60)      NULL,
          dbColumns       NVARCHAR(MAX)     NULL,
          dbData          NVARCHAR(MAX)     NULL,
          chartId         INT               NULL,
          chartUseChart   BIT               NULL,
          chartUseTable   BIT               NULL,
          createdAt       DATETIME          NOT NULL DEFAULT GETUTCDATE(),
          updatedAt       DATETIME          NOT NULL DEFAULT GETUTCDATE(),
          FOREIGN KEY (icrSectionId) REFERENCES dbo.icr_sections(id)
        )
      `);

      this.logger.log('[ICR] Schema verified / migrated');
    } catch (err: any) {
      this.logger.error(`[ICR] Schema migration error: ${err.message}`);
      throw err;
    }
  }

  async createReport(dto: CreateIcrReportDto, user: IcrReportUser): Promise<IcrReportRecord> {
    const periodFrom = new Date(dto.periodFrom);
    const periodTo = new Date(dto.periodTo);

    this.validatePeriod(periodFrom, periodTo);

    const scope: AggregationScope = {
      periodFrom,
      periodTo,
      ...dto.scopeFilters,
    };

    this.logger.log(`[ICR] Creating report "${dto.title}" for user ${user.id}`);

    const data = await this.aggregator.aggregate(scope);

    const pool = await this.db.getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const now = new Date();
      const auditTrail = [
        buildAuditEntry('CREATED', user, {
          toStatus: IcrStatus.DRAFT,
          notes: `Report created covering ${dto.reportingPeriod}.`,
        }),
      ];
      const approvalChain: IcrApprovalChain = {
        preparedBy: user.fullName,
        preparedAt: now.toISOString(),
      };

      const insertReportSql = `
        INSERT INTO dbo.icr_reports (
          title, reportingPeriod, periodFrom, periodTo, framework,
          businessUnit, division, status, overallRating,
          approvalChain, scopeFilters, reportSnapshot,
          version, lastRegeneratedAt, lastRegeneratedBy,
          auditTrail, createdById, createdByName,
          updatedById, updatedByName, createdAt, updatedAt
        )
        OUTPUT INSERTED.id
        VALUES (
          @title, @reportingPeriod, @periodFrom, @periodTo, @framework,
          @businessUnit, @division, @status, @overallRating,
          @approvalChain, @scopeFilters, @reportSnapshot,
          @version, @lastRegeneratedAt, @lastRegeneratedBy,
          @auditTrail, @createdById, @createdByName,
          @updatedById, @updatedByName, @createdAt, @updatedAt
        )
      `;

      const request = new sql.Request(transaction);
      request.input('title', sql.NVarChar(300), dto.title);
      request.input('reportingPeriod', sql.NVarChar(100), dto.reportingPeriod);
      request.input('periodFrom', sql.Date, periodFrom);
      request.input('periodTo', sql.Date, periodTo);
      request.input('framework', sql.NVarChar(50), dto.framework ?? 'COSO');
      request.input('businessUnit', sql.NVarChar(200), dto.businessUnit ?? null);
      request.input('division', sql.NVarChar(200), dto.division ?? null);
      request.input('status', sql.NVarChar(50), IcrStatus.DRAFT);
      request.input('overallRating', sql.NVarChar(50), null);
      request.input('approvalChain', sql.NVarChar(sql.MAX), JSON.stringify(approvalChain));
      request.input('scopeFilters', sql.NVarChar(sql.MAX), dto.scopeFilters ? JSON.stringify(dto.scopeFilters) : null);
      request.input('reportSnapshot', sql.NVarChar(sql.MAX), JSON.stringify(data));
      request.input('version', sql.Int, 1);
      request.input('lastRegeneratedAt', sql.DateTime, now);
      request.input('lastRegeneratedBy', sql.NVarChar(200), user.fullName);
      request.input('auditTrail', sql.NVarChar(sql.MAX), JSON.stringify(auditTrail));
      request.input('createdById', sql.UniqueIdentifier, user.id);
      request.input('createdByName', sql.NVarChar(200), user.fullName);
      request.input('updatedById', sql.UniqueIdentifier, null);
      request.input('updatedByName', sql.NVarChar(200), null);
      request.input('createdAt', sql.DateTime, now);
      request.input('updatedAt', sql.DateTime, now);

      const result = await request.query(insertReportSql);
      const reportId: number = result.recordset[0].id;

      const tempReport: IcrReportRecord = {
        id: reportId,
        title: dto.title,
        reportingPeriod: dto.reportingPeriod,
        periodFrom: periodFrom.toISOString(),
        periodTo: periodTo.toISOString(),
        framework: (dto.framework ?? 'COSO') as any,
        reportMode: dto.reportMode ?? null,
        businessUnit: dto.businessUnit ?? null,
        division: dto.division ?? null,
        templateId: dto.templateId ?? null,
        status: IcrStatus.DRAFT,
        overallRating: null,
        approvalChain,
        scopeFilters: dto.scopeFilters ?? null,
        reportSnapshot: data as unknown as Record<string, unknown>,
        version: 1,
        lastRegeneratedAt: now.toISOString(),
        lastRegeneratedBy: user.fullName,
        auditTrail,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        createdById: user.id,
        createdByName: user.fullName,
        updatedById: null,
        updatedByName: null,
      };

      const configs = await this.loadSectionConfigs(dto.templateId ?? null);
      const engineSections = this.templateEngine.buildAllSections(tempReport, data);

      const sections = configs.length > 0
        ? buildSectionsFromConfigs(configs, engineSections)
        : engineSections;

      await this.applyDefaultOverlays(sections);
      const ownerOverride = (dto.makerFunction || dto.checkerFunction)
        ? { makerFunction: dto.makerFunction, checkerFunction: dto.checkerFunction }
        : undefined;
      await this.persistSections(reportId, sections, user, transaction, configs, ownerOverride);

      const overallRating = this.deriveOverallRating(data.stats);
      const updateRatingReq = new sql.Request(transaction);
      updateRatingReq.input('overallRating', sql.NVarChar(50), overallRating);
      updateRatingReq.input('id', sql.Int, reportId);
      await updateRatingReq.query(
        `UPDATE dbo.icr_reports SET overallRating = @overallRating WHERE id = @id`,
      );

      await transaction.commit();

      this.logger.log(`[ICR] Report #${reportId} created successfully`);
      return this.findById(reportId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async findAll(filters?: {
    status?: IcrStatus;
    businessUnit?: string;
    createdById?: string;
    templateId?: number;
  }): Promise<IcrReportRecord[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 0;

    if (filters?.status) {
      conditions.push(`r.status = @param${paramIdx}`);
      params.push(filters.status);
      paramIdx++;
    }
    if (filters?.businessUnit) {
      conditions.push(`r.businessUnit = @param${paramIdx}`);
      params.push(filters.businessUnit);
      paramIdx++;
    }
    if (filters?.createdById) {
      conditions.push(`r.createdById = @param${paramIdx}`);
      params.push(filters.createdById);
      paramIdx++;
    }
    if (filters?.templateId != null && !Number.isNaN(Number(filters.templateId))) {
      conditions.push(`r.templateId = @param${paramIdx}`);
      params.push(Number(filters.templateId));
      paramIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.db.query(
      `SELECT r.id, r.title, r.reportingPeriod, r.periodFrom, r.periodTo, r.framework,
              r.reportMode,
              r.templateId,
              r.businessUnit, r.division, r.status, r.overallRating,
              r.approvalChain, r.scopeFilters, r.version,
              r.lastRegeneratedAt, r.lastRegeneratedBy, r.auditTrail,
              r.createdAt, r.updatedAt, r.createdById, r.createdByName,
              r.updatedById, r.updatedByName,
              COALESCE(uc.name, uc.username) AS resolvedCreatorName,
              COALESCE(uu.name, uu.username) AS resolvedUpdaterName
       FROM dbo.icr_reports r
       LEFT JOIN dbo.Users uc ON CAST(r.createdById AS NVARCHAR(200)) = CAST(uc.id AS NVARCHAR(200))
       LEFT JOIN dbo.Users uu ON CAST(r.updatedById AS NVARCHAR(200)) = CAST(uu.id AS NVARCHAR(200))
       ${whereClause}
       ORDER BY r.createdAt DESC`,
      params,
    );

    return (rows || []).map((row: any) => mapReportRow({ ...row, reportSnapshot: null }));
  }

  async getMyTaskReports(
    user: IcrReportUser & { roles?: string[]; isAdmin?: boolean; groupName?: string; role?: string },
    filterTemplateId?: number,
  ): Promise<IcrTaskReportRecord[]> {
    const fullAccess = userHasFullIcrAccess(user);
    const roleSet = new Set(user.roles ?? []);
    const canPrepare = roleSet.has(IcrRole.PREPARER) || roleSet.has(IcrRole.ADMIN) || fullAccess;
    const canReview = roleSet.has(IcrRole.REVIEWER) || roleSet.has(IcrRole.APPROVER) || roleSet.has(IcrRole.ADMIN) || fullAccess;
    const userFunctions = new Set((await this.loadUserFunctionNames(user.id)).map((name) => this.normalizeFunctionLabel(name)));

    let templateSql = '';
    const sqlParams: any[] = [];
    if (filterTemplateId != null && filterTemplateId > 0) {
      let includeLegacyNull = false;
      try {
        const tpl = await this.templateAdmin.getTemplate(filterTemplateId);
        includeLegacyNull = tpl.isDefault === true;
      } catch {
        includeLegacyNull = false;
      }
      templateSql = ' AND (r.templateId = @param0';
      sqlParams.push(filterTemplateId);
      if (includeLegacyNull) {
        templateSql += ' OR r.templateId IS NULL';
      }
      templateSql += ')';
    }

    const rows = await this.db.query(
      `SELECT
         r.id AS reportId,
         r.title AS reportTitle,
         r.reportingPeriod,
         r.framework,
         r.businessUnit,
         r.status AS reportStatus,
         r.templateId AS templateId,
         s.sectionType,
         s.title AS sectionTitle,
         s.sortOrder,
         s.contentType,
         s.sectionStatus,
         s.sectionOwner,
         s.sectionOwnerInitials,
         s.ownership
       FROM dbo.icr_reports r
       JOIN dbo.icr_sections s ON s.icrReportId = r.id
       WHERE s.isVisible = 1${templateSql}
       ORDER BY r.createdAt DESC, s.sortOrder ASC`,
      sqlParams,
    );

    const reports = new Map<number, IcrTaskReportRecord>();
    for (const row of rows ?? []) {
      const sectionType = row.sectionType as IcrSectionType;
      const defaultOwner = DEFAULT_SECTION_OWNERS[sectionType];
      const defaultOwnership = SECTION_OWNERSHIP_MAP[sectionType] ?? null;
      const ownership = parseJsonColumn<SectionOwnership | null>(row.ownership, defaultOwnership);
      const makerMatch = ownership?.makerFunction
        ? userFunctions.has(this.normalizeFunctionLabel(ownership.makerFunction))
        : false;
      const checkerMatch = ownership?.checkerFunction
        ? userFunctions.has(this.normalizeFunctionLabel(ownership.checkerFunction))
        : false;

      // Tasks are function-scoped unless user has full ICR access (e.g. super admin).
      if (!fullAccess && !makerMatch && !checkerMatch) {
        continue;
      }

      const matchedRole: IcrTaskSectionRecord['matchedRole'] = fullAccess
        ? 'admin'
        : makerMatch && checkerMatch
          ? 'both'
          : makerMatch
            ? 'maker'
            : 'checker';

      const sectionStatus = row.sectionStatus as IcrSectionStatus;
      const isLocked = sectionStatus === IcrSectionStatus.LOCKED;
      const editableKeys = getEditableKeysForSection(sectionType);
      const resolvedContentType =
        (row.contentType as IcrContentType) ??
        SECTION_CONTENT_TYPE_MAP[sectionType as IcrSectionType] ??
        IcrContentType.DYNAMIC;
      const ctUpper = String(resolvedContentType || '').toUpperCase();
      /** Template-specific `sectionType` strings are not in ICR_SECTION_EDITABLE_KEYS — still surface them for tasks when editable by content type. */
      const isDynamicLike =
        ctUpper === 'DYNAMIC' ||
        ctUpper === 'MIXED' ||
        ctUpper === 'EDITABLE' ||
        ctUpper === 'DATABASE' ||
        ctUpper === 'TABLE' ||
        ctUpper === 'CHART';
      if (editableKeys.length === 0 && !isDynamicLike) {
        continue;
      }
      const canEditBody = editableKeys.length > 0 || isDynamicLike;
      const sectionTask: IcrTaskSectionRecord = {
        sectionType,
        title: row.sectionTitle,
        sortOrder: Number(row.sortOrder ?? 0),
        sectionStatus,
        contentType: resolvedContentType,
        sectionOwner: row.sectionOwner ?? defaultOwner?.label ?? null,
        sectionOwnerInitials: row.sectionOwnerInitials ?? defaultOwner?.initials ?? null,
        ownership,
        matchedRole,
        canSave:
          canEditBody &&
          !isLocked &&
          canPrepare &&
          (fullAccess || makerMatch) &&
          (sectionStatus === IcrSectionStatus.GENERATED || sectionStatus === IcrSectionStatus.REJECTED),
        canSubmit:
          canEditBody &&
          !isLocked &&
          canPrepare &&
          (fullAccess || makerMatch) &&
          (sectionStatus === IcrSectionStatus.GENERATED || sectionStatus === IcrSectionStatus.REJECTED),
        canBeginReview:
          !isLocked &&
          canReview &&
          (fullAccess || checkerMatch) &&
          sectionStatus === IcrSectionStatus.SUBMITTED,
        canApprove:
          !isLocked &&
          canReview &&
          (fullAccess || checkerMatch) &&
          sectionStatus === IcrSectionStatus.UNDER_REVIEW,
        canReject:
          !isLocked &&
          canReview &&
          (fullAccess || checkerMatch) &&
          sectionStatus === IcrSectionStatus.UNDER_REVIEW,
      };

      const existing = reports.get(row.reportId);
      if (existing) {
        existing.sections.push(sectionTask);
      } else {
        reports.set(row.reportId, {
          id: row.reportId,
          title: row.reportTitle,
          reportingPeriod: row.reportingPeriod,
          framework: row.framework,
          businessUnit: row.businessUnit ?? null,
          status: row.reportStatus,
          templateId: row.templateId != null ? Number(row.templateId) : null,
          sections: [sectionTask],
        });
      }
    }

    return Array.from(reports.values()).map((report) => ({
      ...report,
      sections: report.sections.sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }

  /**
   * Tasks page: section configs that can carry placeholders / tag-driven content (same family as task list).
   * Function-scoped for normal users; full ICR access (e.g. super admin) returns all matching configs.
   */
  async getTaskTemplateSectionConfigs(
    user: IcrReportUser & { roles?: string[]; isAdmin?: boolean; groupName?: string; role?: string },
    templateId: number,
  ): Promise<SectionConfigRow[]> {
    const all = await this.templateAdmin.getConfigs(templateId);
    const dynamic = all.filter((c) => {
      const t = (c.contentType || '').toUpperCase();
      return (
        (t === 'DYNAMIC' ||
          t === 'MIXED' ||
          t === 'EDITABLE' ||
          t === 'DATABASE' ||
          t === 'TABLE' ||
          t === 'CHART') &&
        c.isEnabled
      );
    });

    if (userHasFullIcrAccess(user)) {
      return dynamic.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    const userFuncs = new Set(
      (await this.loadUserFunctionNames(user.id)).map((name) => this.normalizeFunctionLabel(name)),
    );

    const filtered = dynamic.filter((cfg) => {
      const st = cfg.sectionType as IcrSectionType;
      const defaultOwn = SECTION_OWNERSHIP_MAP[st] ?? null;
      const raw = cfg.ownership as SectionOwnership | Record<string, string> | null | undefined;
      const own: SectionOwnership | null =
        raw && typeof raw === 'object' && ('makerFunction' in raw || 'checkerFunction' in raw)
          ? (raw as SectionOwnership)
          : defaultOwn;
      const makerMatch = own?.makerFunction
        ? userFuncs.has(this.normalizeFunctionLabel(own.makerFunction))
        : false;
      const checkerMatch = own?.checkerFunction
        ? userFuncs.has(this.normalizeFunctionLabel(own.checkerFunction))
        : false;
      return makerMatch || checkerMatch;
    });

    return filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async findById(id: number): Promise<IcrReportRecord> {
    const reportRows = await this.db.query(
      `SELECT r.id, r.title, r.reportingPeriod, r.periodFrom, r.periodTo, r.framework,
              r.reportMode,
              r.businessUnit, r.division, r.status, r.overallRating,
              r.approvalChain, r.scopeFilters, r.version,
              r.lastRegeneratedAt, r.lastRegeneratedBy, r.auditTrail,
              r.createdAt, r.updatedAt, r.createdById, r.createdByName,
              r.updatedById, r.updatedByName,
              COALESCE(uc.name, uc.username) AS resolvedCreatorName,
              COALESCE(uu.name, uu.username) AS resolvedUpdaterName
       FROM dbo.icr_reports r
       LEFT JOIN dbo.Users uc ON CAST(r.createdById AS NVARCHAR(200)) = CAST(uc.id AS NVARCHAR(200))
       LEFT JOIN dbo.Users uu ON CAST(r.updatedById AS NVARCHAR(200)) = CAST(uu.id AS NVARCHAR(200))
       WHERE r.id = @param0`,
      [id],
    );

    if (!reportRows?.length) {
      throw new NotFoundException(`ICR Report #${id} not found.`);
    }

    const report = mapReportRow({ ...reportRows[0], reportSnapshot: null });

    const sectionRows = await this.db.query(
      `SELECT s.id, s.icrReportId, s.sectionType, s.title, s.sortOrder, s.content,
              s.contentType, s.sectionStatus, s.isVisible, s.reviewerNotes, s.rejectionReason,
              s.sectionOwner, s.sectionOwnerInitials, s.ownership, s.workflowHistory,
              s.version, s.lastRegeneratedAt, s.createdAt, s.updatedAt,
              s.createdById, s.createdByName, s.updatedById, s.updatedByName,
              COALESCE(uc.name, uc.username) AS resolvedCreatorName,
              COALESCE(uu.name, uu.username) AS resolvedUpdaterName
       FROM dbo.icr_sections s
       LEFT JOIN dbo.Users uc ON CAST(s.createdById AS NVARCHAR(200)) = CAST(uc.id AS NVARCHAR(200))
       LEFT JOIN dbo.Users uu ON CAST(s.updatedById AS NVARCHAR(200)) = CAST(uu.id AS NVARCHAR(200))
       WHERE s.icrReportId = @param0 AND s.isVisible = 1
       ORDER BY s.sortOrder ASC`,
      [id],
    );

    report.sections = (sectionRows || []).map(mapSectionRow);
    return report;
  }

  async findSection(reportId: number, sectionType: IcrSectionType): Promise<IcrSectionRecord> {
    const rows = await this.db.query(
      `SELECT s.id, s.icrReportId, s.sectionType, s.title, s.sortOrder, s.content,
              s.contentType, s.sectionStatus, s.isVisible, s.reviewerNotes, s.rejectionReason,
              s.sectionOwner, s.sectionOwnerInitials, s.ownership, s.workflowHistory,
              s.version, s.lastRegeneratedAt, s.createdAt, s.updatedAt,
              s.createdById, s.createdByName, s.updatedById, s.updatedByName,
              COALESCE(uc.name, uc.username) AS resolvedCreatorName,
              COALESCE(uu.name, uu.username) AS resolvedUpdaterName
       FROM dbo.icr_sections s
       LEFT JOIN dbo.Users uc ON CAST(s.createdById AS NVARCHAR(200)) = CAST(uc.id AS NVARCHAR(200))
       LEFT JOIN dbo.Users uu ON CAST(s.updatedById AS NVARCHAR(200)) = CAST(uu.id AS NVARCHAR(200))
       WHERE s.icrReportId = @param0 AND s.sectionType = @param1`,
      [reportId, sectionType],
    );

    if (!rows?.length) {
      throw new NotFoundException(
        `Section "${sectionType}" not found in ICR Report #${reportId}.`,
      );
    }

    return mapSectionRow(rows[0]);
  }

  async updateStatus(
    id: number,
    dto: UpdateIcrStatusDto,
    user: IcrReportUser,
    version: number,
  ): Promise<IcrReportRecord> {
    const report = await this.findById(id);

    this.assertTransitionAllowed(report.status, dto.status);

    const auditEntry = buildAuditEntry('STATUS_CHANGED', user, {
      fromStatus: report.status,
      toStatus: dto.status,
      notes: dto.comment,
    });

    const updatedApprovalChain = this.applyApprovalChainStep(
      report.approvalChain ?? {},
      dto.status,
      user,
    );

    const updatedAuditTrail = [...(report.auditTrail ?? []), auditEntry];

    const result = await this.db.query(
      `UPDATE dbo.icr_reports
       SET status = @param0,
           approvalChain = @param1,
           auditTrail = @param2,
           updatedById = @param3,
           updatedByName = @param4,
           version = version + 1,
           updatedAt = GETUTCDATE()
       WHERE id = @param5 AND version = @param6;
       SELECT @@ROWCOUNT AS rowsAffected;`,
      [
        dto.status,
        JSON.stringify(updatedApprovalChain),
        JSON.stringify(updatedAuditTrail),
        user.id,
        user.fullName,
        id,
        version,
      ],
    );

    const rowsAffected = result?.[0]?.rowsAffected ?? 0;
    if (rowsAffected === 0) {
      throw new ConflictException(
        `ICR Report #${id} was modified by another user. Please reload and try again.`,
      );
    }

    this.logger.log(
      `[ICR] Report #${id} status: ${report.status} → ${dto.status} by user ${user.id}`,
    );

    return this.findById(id);
  }

  async regenerate(id: number, user: IcrReportUser): Promise<IcrReportRecord> {
    const report = await this.findById(id);

    if (LOCKED_STATUSES.includes(report.status)) {
      throw new ForbiddenException(
        `ICR Report #${id} is ${report.status} and cannot be regenerated. ` +
        `Revert to IN_REVIEW first.`,
      );
    }

    const scope: AggregationScope = {
      periodFrom: new Date(report.periodFrom),
      periodTo: new Date(report.periodTo),
      ...(report.scopeFilters ?? {}),
    };

    this.logger.log(`[ICR] Regenerating report #${id}`);
    const data = await this.aggregator.aggregate(scope);

    const pool = await this.db.getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const configs = await this.loadSectionConfigs(report.templateId ?? null);
      const engineSections = this.templateEngine.buildAllSections(report, data);

      const sections = configs.length > 0
        ? buildSectionsFromConfigs(configs, engineSections)
        : engineSections;

      await this.applyDefaultOverlays(sections);

      const deleteReq = new sql.Request(transaction);
      deleteReq.input('reportId', sql.Int, id);
      await deleteReq.query(`DELETE FROM dbo.icr_sections WHERE icrReportId = @reportId`);

      await this.persistSections(id, sections, user, transaction, configs);

      const overallRating = this.deriveOverallRating(data.stats);
      const auditEntry = buildAuditEntry('REGENERATED', user, {
        notes: 'Full report data regenerated.',
      });
      const updatedAuditTrail = [...(report.auditTrail ?? []), auditEntry];

      const updateReq = new sql.Request(transaction);
      updateReq.input('reportSnapshot', sql.NVarChar(sql.MAX), JSON.stringify(data));
      updateReq.input('overallRating', sql.NVarChar(50), overallRating);
      updateReq.input('lastRegeneratedAt', sql.DateTime, new Date());
      updateReq.input('lastRegeneratedBy', sql.NVarChar(200), user.fullName);
      updateReq.input('auditTrail', sql.NVarChar(sql.MAX), JSON.stringify(updatedAuditTrail));
      updateReq.input('updatedById', sql.UniqueIdentifier, user.id);
      updateReq.input('updatedByName', sql.NVarChar(200), user.fullName);
      updateReq.input('status', sql.NVarChar(50), IcrStatus.DRAFT);
      updateReq.input('id', sql.Int, id);
      await updateReq.query(`
        UPDATE dbo.icr_reports
        SET reportSnapshot = @reportSnapshot,
            overallRating = @overallRating,
            lastRegeneratedAt = @lastRegeneratedAt,
            lastRegeneratedBy = @lastRegeneratedBy,
            auditTrail = @auditTrail,
            updatedById = @updatedById,
            updatedByName = @updatedByName,
            status = @status,
            version = version + 1,
            updatedAt = GETUTCDATE()
        WHERE id = @id
      `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    this.logger.log(`[ICR] Report #${id} regenerated successfully`);
    return this.findById(id);
  }

  async regenerateSection(
    reportId: number,
    dto: RegenerateSectionDto,
    user: IcrReportUser,
  ): Promise<IcrSectionRecord> {
    const report = await this.findById(reportId);

    if (LOCKED_STATUSES.includes(report.status)) {
      throw new ForbiddenException(
        `ICR Report #${reportId} is ${report.status}. Revert to IN_REVIEW before regenerating sections.`,
      );
    }

    let existing: IcrSectionRecord | null = null;
    try {
      existing = await this.findSection(reportId, dto.sectionType);
    } catch {
      // Section does not exist yet — will create
    }

    if (existing?.sectionStatus === IcrSectionStatus.LOCKED) {
      throw new ForbiddenException(
        `Section "${dto.sectionType}" in Report #${reportId} is locked. ` +
        `Only an approver can unlock it.`,
      );
    }

    const scope: AggregationScope = {
      periodFrom: new Date(report.periodFrom),
      periodTo: new Date(report.periodTo),
      ...(report.scopeFilters ?? {}),
    };

    const data = await this.aggregator.aggregate(scope);
    const allBuilt = this.templateEngine.buildAllSections(report, data);
    const rebuilt = allBuilt.find((s) => s.sectionType === dto.sectionType);

    if (!rebuilt) {
      throw new BadRequestException(`No template builder found for section type "${dto.sectionType}".`);
    }

    await this.applyDefaultOverlays([rebuilt]);

    const pool = await this.db.getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      if (existing) {
        const updateReq = new sql.Request(transaction);
        updateReq.input('content', sql.NVarChar(sql.MAX), JSON.stringify(rebuilt.content));
        updateReq.input('sectionStatus', sql.NVarChar(50), IcrSectionStatus.GENERATED);
        updateReq.input('lastRegeneratedAt', sql.DateTime, new Date());
        updateReq.input('updatedById', sql.UniqueIdentifier, user.id);
        updateReq.input('updatedByName', sql.NVarChar(200), user.fullName);
        updateReq.input('id', sql.Int, existing.id);
        await updateReq.query(`
          UPDATE dbo.icr_sections
          SET content = @content,
              sectionStatus = @sectionStatus,
              lastRegeneratedAt = @lastRegeneratedAt,
              updatedById = @updatedById,
              updatedByName = @updatedByName,
              version = version + 1,
              updatedAt = GETUTCDATE()
          WHERE id = @id
        `);
      } else {
        await this.insertSection(reportId, rebuilt, user, transaction);
      }

      const auditEntry = buildAuditEntry('SECTION_REGENERATED', user, {
        notes: `Section "${dto.sectionType}" regenerated individually.`,
      });
      const updatedAuditTrail = [...(report.auditTrail ?? []), auditEntry];

      const updateReportReq = new sql.Request(transaction);
      updateReportReq.input('auditTrail', sql.NVarChar(sql.MAX), JSON.stringify(updatedAuditTrail));
      updateReportReq.input('updatedById', sql.UniqueIdentifier, user.id);
      updateReportReq.input('updatedByName', sql.NVarChar(200), user.fullName);
      updateReportReq.input('reportId', sql.Int, reportId);
      await updateReportReq.query(`
        UPDATE dbo.icr_reports
        SET auditTrail = @auditTrail,
            updatedById = @updatedById,
            updatedByName = @updatedByName,
            updatedAt = GETUTCDATE()
        WHERE id = @reportId
      `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return this.findSection(reportId, dto.sectionType);
  }

  async updateSectionNotes(
    reportId: number,
    sectionType: IcrSectionType,
    notes: string,
    user: IcrReportUser,
  ): Promise<IcrSectionRecord> {
    try {
      const section = await this.findSection(reportId, sectionType);

      if (section.sectionStatus === IcrSectionStatus.LOCKED) {
        throw new ForbiddenException(`Section "${sectionType}" is locked and cannot be edited.`);
      }

      await this.db.query(
        `UPDATE dbo.icr_sections
         SET reviewerNotes = @param0,
             updatedById = @param1,
             updatedByName = @param2,
             updatedAt = GETUTCDATE()
         WHERE id = @param3`,
        [notes, user.id, user.fullName, section.id],
      );

      return this.findSection(reportId, sectionType);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `[updateSectionNotes] Unexpected error for report=${reportId} section=${sectionType}: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Failed to save notes for section "${sectionType}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateSectionContent(
    reportId: number,
    sectionType: IcrSectionType,
    incoming: Record<string, unknown>,
    user: IcrReportUser,
  ): Promise<IcrSectionRecord> {
    try {
      const report = await this.findById(reportId);
      if (LOCKED_STATUSES.includes(report.status)) {
        throw new ForbiddenException(
          `ICR Report #${reportId} is ${report.status}; section content cannot be edited.`,
        );
      }

      const section = await this.findSection(reportId, sectionType);
      if (section.sectionStatus === IcrSectionStatus.LOCKED) {
        throw new ForbiddenException(`Section "${sectionType}" is locked.`);
      }

      const allowedKeys = getEditableKeysForSection(sectionType);
      const placeholderKeys: string[] = Array.isArray(section.content?._placeholderKeys)
        ? (section.content._placeholderKeys as string[])
        : [];
      const allAllowed = [...allowedKeys, ...placeholderKeys];

      if (!allAllowed.length) {
        throw new BadRequestException(
          `Section "${sectionType}" has no editable fields.`,
        );
      }
      const allowed = new Set(allAllowed);
      const merged: Record<string, unknown> = { ...(section.content ?? {}) };
      for (const [k, v] of Object.entries(incoming ?? {})) {
        if (allowed.has(k)) {
          merged[k] = v;
        }
      }

      const nextStatus =
        section.sectionStatus === IcrSectionStatus.REVIEWED
          ? IcrSectionStatus.GENERATED
          : section.sectionStatus;

      const contentJson = JSON.stringify(merged);
      this.logger.debug(
        `[updateSectionContent] report=${reportId} section=${sectionType} contentLen=${contentJson.length} keys=${Object.keys(incoming ?? {}).join(',')}`,
      );

      const pool = await this.db.getConnection();
      const req = new sql.Request(pool);
      req.input('content', sql.NVarChar(sql.MAX), contentJson);
      req.input('sectionStatus', sql.NVarChar(50), nextStatus);
      req.input('updatedById', sql.NVarChar(200), user.id);
      req.input('updatedByName', sql.NVarChar(200), user.fullName);
      req.input('sectionId', sql.Int, section.id);
      await req.query(
        `UPDATE dbo.icr_sections
         SET content = @content,
             sectionStatus = @sectionStatus,
             updatedById = @updatedById,
             updatedByName = @updatedByName,
             version = version + 1,
             updatedAt = GETUTCDATE()
         WHERE id = @sectionId`,
      );

      return this.findSection(reportId, sectionType);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `[updateSectionContent] Unexpected error for report=${reportId} section=${sectionType}: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Failed to save section "${sectionType}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSectionDefault(sectionType: IcrSectionType): Promise<{
    sectionType: string;
    content: Record<string, unknown>;
  }> {
    const content = await this.loadDefaultSectionOverlay(sectionType);
    return { sectionType, content };
  }

  async updateSectionDefault(
    sectionType: IcrSectionType,
    content: Record<string, unknown>,
    user: IcrReportUser,
  ): Promise<{ sectionType: string; content: Record<string, unknown> }> {
    const json = JSON.stringify(content ?? {});
    const existing = await this.db.query(
      `SELECT sectionType FROM dbo.icr_default_sections WHERE sectionType = @param0`,
      [sectionType],
    );
    if (existing?.length) {
      await this.db.query(
        `UPDATE dbo.icr_default_sections
         SET content = @param0,
             updatedByName = @param1,
             updatedById = @param2,
             updatedAt = GETUTCDATE()
         WHERE sectionType = @param3`,
        [json, user.fullName, user.id, sectionType],
      );
    } else {
      await this.db.query(
        `INSERT INTO dbo.icr_default_sections (
           sectionType, content, updatedByName, updatedById, createdAt, updatedAt
         ) VALUES (
           @param0, @param1, @param2, @param3, GETUTCDATE(), GETUTCDATE()
         )`,
        [sectionType, json, user.fullName, user.id],
      );
    }
    return this.getSectionDefault(sectionType);
  }

  async updateSectionOwner(
    reportId: number,
    sectionType: IcrSectionType,
    owner: string,
    initials: string,
    user: IcrReportUser,
    makerFunction?: string,
    checkerFunction?: string,
  ): Promise<IcrSectionRecord> {
    const lightRows = await this.db.query(
      `SELECT id, ownership FROM dbo.icr_sections
       WHERE icrReportId = @param0 AND sectionType = @param1`,
      [reportId, sectionType],
    );
    if (!lightRows?.length) {
      throw new NotFoundException(`Section "${sectionType}" not found in ICR Report #${reportId}.`);
    }
    const sectionId = lightRows[0].id;
    const rawOwnership = lightRows[0].ownership;
    let currentOwnership = { makerFunction: '', makerInitials: '', checkerFunction: '', checkerInitials: '' };
    if (rawOwnership) {
      try {
        currentOwnership = typeof rawOwnership === 'object' ? rawOwnership : JSON.parse(rawOwnership);
      } catch { /* keep defaults */ }
    }

    const assigningFunctions = makerFunction !== undefined || checkerFunction !== undefined;
    const mergedMaker = makerFunction !== undefined ? makerFunction : currentOwnership.makerFunction;
    const mergedChecker = checkerFunction !== undefined ? checkerFunction : currentOwnership.checkerFunction;
    const newMakerTrim = String(mergedMaker ?? '').trim();
    const newCheckerTrim = String(mergedChecker ?? '').trim();

    if (assigningFunctions && (!newMakerTrim || !newCheckerTrim)) {
      throw new BadRequestException(
        'When assigning maker/checker functions, both maker function and checker function must be set (non-empty).',
      );
    }

    const newMaker = newMakerTrim;
    const newChecker = newCheckerTrim;
    const newOwnership = {
      makerFunction: newMaker,
      makerInitials: newMaker ? newMaker.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 3) : '',
      checkerFunction: newChecker,
      checkerInitials: newChecker ? newChecker.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 3) : '',
    };
    const ownershipJson = JSON.stringify(newOwnership);

    const pool = await this.db.getConnection();
    const req = new sql.Request(pool);
    req.input('sectionOwner', sql.NVarChar(200), owner);
    req.input('sectionOwnerInitials', sql.NVarChar(10), initials);
    req.input('ownership', sql.NVarChar(sql.MAX), ownershipJson);
    req.input('updatedById', sql.UniqueIdentifier, user.id);
    req.input('updatedByName', sql.NVarChar(200), user.fullName);
    req.input('id', sql.Int, sectionId);

    const result = await req.query(
      `UPDATE dbo.icr_sections
       SET sectionOwner = @sectionOwner,
           sectionOwnerInitials = @sectionOwnerInitials,
           ownership = @ownership,
           updatedById = @updatedById,
           updatedByName = @updatedByName,
           updatedAt = GETUTCDATE()
       OUTPUT inserted.*
       WHERE id = @id`,
    );

    this.logger.log(
      `[ICR] Section "${sectionType}" in Report #${reportId} owner changed to "${owner}" (maker: ${newMaker}, checker: ${newChecker}) by user ${user.id}`,
    );

    const row = result.recordset?.[0];
    const mapped = row ? mapSectionRow(row) : await this.findSection(reportId, sectionType);

    if (assigningFunctions && newMaker && newChecker) {
      try {
        const report = await this.findById(reportId);
        await this.notifications.notifySectionAssigned({
          reportId,
          reportTitle: report.title ?? `Report #${reportId}`,
          sectionType,
          sectionTitle: mapped.title ?? sectionType,
          makerFunction: newMaker,
          checkerFunction: newChecker,
          assignedByName: user.fullName,
          assignedById: user.id,
        });
      } catch (err) {
        this.logger.warn(`[ICR] Section assign notification failed: ${(err as Error).message}`);
      }
    }

    return mapped;
  }

  async markSectionReviewed(
    reportId: number,
    sectionType: IcrSectionType,
    user: IcrReportUser,
  ): Promise<IcrSectionRecord> {
    const section = await this.findSection(reportId, sectionType);

    if (section.sectionStatus === IcrSectionStatus.LOCKED) {
      throw new ForbiddenException(`Section "${sectionType}" is already locked.`);
    }

    await this.db.query(
      `UPDATE dbo.icr_sections
       SET sectionStatus = @param0,
           updatedById = @param1,
           updatedByName = @param2,
           updatedAt = GETUTCDATE()
       WHERE id = @param3`,
      [IcrSectionStatus.REVIEWED, user.id, user.fullName, section.id],
    );

    return this.findSection(reportId, sectionType);
  }

  async toggleSectionVisibility(
    reportId: number,
    sectionType: IcrSectionType,
    isVisible: boolean,
    user: IcrReportUser,
  ): Promise<IcrSectionRecord> {
    const section = await this.findSection(reportId, sectionType);

    await this.db.query(
      `UPDATE dbo.icr_sections
       SET isVisible = @param0,
           updatedById = @param1,
           updatedByName = @param2,
           updatedAt = GETUTCDATE()
       WHERE id = @param3`,
      [isVisible ? 1 : 0, user.id, user.fullName, section.id],
    );

    return this.findSection(reportId, sectionType);
  }

  async archive(id: number, user: IcrReportUser): Promise<IcrReportRecord> {
    return this.updateStatus(
      id,
      { status: IcrStatus.ARCHIVED, comment: 'Manually archived.', version: (await this.findById(id)).version },
      user,
      (await this.findById(id)).version,
    );
  }

  async deleteReport(id: number, user: IcrReportUser): Promise<void> {
    const rows = await this.db.query(
      `SELECT id, status FROM dbo.icr_reports WHERE id = @param0`,
      [id],
    );
    if (!rows?.length) throw new Error(`Report ${id} not found.`);
    if (rows[0].status === IcrStatus.PUBLISHED) {
      throw new Error('Cannot delete a published report.');
    }
    this.logger.log(`[ICR] Deleting report #${id} by user ${user.id}`);
    await this.db.query(`DELETE FROM dbo.icr_sections WHERE icrReportId = @param0`, [id]);
    await this.db.query(`DELETE FROM dbo.icr_reports WHERE id = @param0`, [id]);
    this.logger.log(`[ICR] Report #${id} deleted successfully`);
  }

  private async loadDefaultSectionOverlay(
    sectionType: string,
  ): Promise<Record<string, unknown>> {
    const rows = await this.db.query(
      `SELECT content FROM dbo.icr_default_sections WHERE sectionType = @param0`,
      [sectionType],
    );
    if (!rows?.length) {
      return {};
    }
    return parseJsonColumn<Record<string, unknown>>(rows[0].content, {});
  }

  /** Merges DB-stored default JSON over template output (admin-maintained overlays). */
  private async applyDefaultOverlays(sections: SectionOutput[]): Promise<void> {
    for (const s of sections) {
      const overlay = await this.loadDefaultSectionOverlay(s.sectionType);
      if (overlay && Object.keys(overlay).length) {
        s.content = { ...s.content, ...overlay };
      }
    }
  }

  private async persistSections(
    reportId: number,
    sections: SectionOutput[],
    user: IcrReportUser,
    transaction: sql.Transaction,
    configs: SectionConfigRecord[] = [],
    ownerOverride?: { makerFunction?: string; checkerFunction?: string },
  ): Promise<void> {
    const cfgMap = new Map(configs.map(c => [c.sectionType, c]));
    for (const s of sections) {
      await this.insertSection(reportId, s, user, transaction, cfgMap.get(s.sectionType), ownerOverride);
    }
  }

  private normalizeFunctionLabel(value: unknown): string {
    return String(value ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private async loadUserFunctionNames(userId: string): Promise<string[]> {
    const rows = await this.db.query(
      `SELECT f.name
       FROM dbo.UserFunction uf
       JOIN dbo.Functions f ON f.id = uf.functionId
       WHERE uf.userId = @param0
         AND uf.deletedAt IS NULL
         AND f.isDeleted = 0
         AND f.deletedAt IS NULL
       ORDER BY f.name`,
      [userId],
    );
    return (rows ?? []).map((row: any) => String(row.name ?? '').trim()).filter(Boolean);
  }

  private async insertSection(
    reportId: number,
    section: SectionOutput,
    user: IcrReportUser,
    transaction: sql.Transaction,
    config?: SectionConfigRecord,
    ownerOverride?: { makerFunction?: string; checkerFunction?: string },
  ): Promise<void> {
    const now = new Date();
    const st = section.sectionType as IcrSectionType;
    const defaultOwner = DEFAULT_SECTION_OWNERS[st];

    let ownership: SectionOwnership | null = SECTION_OWNERSHIP_MAP[st] ?? null;
    if (ownerOverride) {
      const maker = ownerOverride.makerFunction ?? ownership?.makerFunction ?? 'Risk Management';
      const checker = ownerOverride.checkerFunction ?? ownership?.checkerFunction ?? 'CRO Office';
      ownership = {
        makerFunction: maker,
        makerInitials: maker.split(' ').map(w => w[0]).join('').slice(0, 3),
        checkerFunction: checker,
        checkerInitials: checker.split(' ').map(w => w[0]).join('').slice(0, 3),
      };
    } else if (config?.ownership) {
      ownership = {
        makerFunction: config.ownership.makerFunction ?? ownership?.makerFunction ?? 'Risk Management',
        makerInitials: (config.ownership.makerFunction ?? '').split(' ').map(w => w[0]).join('').slice(0, 3),
        checkerFunction: config.ownership.checkerFunction ?? ownership?.checkerFunction ?? 'CRO Office',
        checkerInitials: (config.ownership.checkerFunction ?? '').split(' ').map(w => w[0]).join('').slice(0, 3),
      };
    }

    const hasTags = config?.placeholders?.some(p => p.startsWith('{{')) ?? false;
    const contentType = hasTags
      ? IcrContentType.DYNAMIC
      : config?.contentType === 'LOCKED'
        ? IcrContentType.STATIC
        : (SECTION_CONTENT_TYPE_MAP[st] ?? (config ? IcrContentType.STATIC : IcrContentType.DYNAMIC));
    const initialHistory: SectionWorkflowEntry[] = [{
      action: 'GENERATED',
      userId: user.id,
      userName: user.fullName,
      timestamp: now.toISOString(),
      notes: 'Section generated from GRC data',
      toStatus: IcrSectionStatus.GENERATED,
    }];

    const req = new sql.Request(transaction);
    req.input('icrReportId', sql.Int, reportId);
    req.input('sectionType', sql.NVarChar(60), section.sectionType);
    req.input('title', sql.NVarChar(300), section.title);
    req.input('sortOrder', sql.Int, section.sortOrder);
    req.input('content', sql.NVarChar(sql.MAX), JSON.stringify(section.content));
    req.input('contentType', sql.NVarChar(20), contentType);
    req.input('sectionStatus', sql.NVarChar(50), IcrSectionStatus.GENERATED);
    req.input('isVisible', sql.Bit, 1);
    req.input('sectionOwner', sql.NVarChar(200), defaultOwner?.label ?? null);
    req.input('sectionOwnerInitials', sql.NVarChar(10), defaultOwner?.initials ?? null);
    req.input('ownership', sql.NVarChar(sql.MAX), ownership ? JSON.stringify(ownership) : null);
    req.input('workflowHistory', sql.NVarChar(sql.MAX), JSON.stringify(initialHistory));
    req.input('version', sql.Int, 1);
    req.input('lastRegeneratedAt', sql.DateTime, now);
    req.input('createdById', sql.UniqueIdentifier, user.id);
    req.input('createdByName', sql.NVarChar(200), user.fullName);
    req.input('createdAt', sql.DateTime, now);
    req.input('updatedAt', sql.DateTime, now);

    await req.query(`
      INSERT INTO dbo.icr_sections (
        icrReportId, sectionType, title, sortOrder, content, contentType,
        sectionStatus, isVisible, sectionOwner, sectionOwnerInitials,
        ownership, workflowHistory,
        version, lastRegeneratedAt,
        createdById, createdByName, createdAt, updatedAt
      ) VALUES (
        @icrReportId, @sectionType, @title, @sortOrder, @content, @contentType,
        @sectionStatus, @isVisible, @sectionOwner, @sectionOwnerInitials,
        @ownership, @workflowHistory,
        @version, @lastRegeneratedAt,
        @createdById, @createdByName, @createdAt, @updatedAt
      )
    `);
  }

  private validatePeriod(from: Date, to: Date): void {
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid period dates provided.');
    }
    if (from > to) {
      throw new BadRequestException('periodFrom must be before periodTo.');
    }
    const daysDiff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 366) {
      throw new BadRequestException('Reporting period cannot exceed 366 days.');
    }
  }

  private assertTransitionAllowed(from: IcrStatus, to: IcrStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Status transition from "${from}" to "${to}" is not permitted. ` +
        `Allowed transitions: ${allowed.join(', ') || 'none'}.`,
      );
    }
  }

  private applyApprovalChainStep(
    chain: NonNullable<IcrReportRecord['approvalChain']>,
    status: IcrStatus,
    user: IcrReportUser,
  ): NonNullable<IcrReportRecord['approvalChain']> {
    const now = new Date().toISOString();
    switch (status) {
      case IcrStatus.IN_REVIEW:
        return { ...chain, reviewedBy: user.fullName, reviewedAt: now };
      case IcrStatus.APPROVED:
        return { ...chain, approvedBy: user.fullName, approvedAt: now };
      case IcrStatus.PUBLISHED:
        return { ...chain, publishedBy: user.fullName, publishedAt: now };
      default:
        return chain;
    }
  }

  private deriveOverallRating(stats: {
    ineffectiveControls: number;
    totalControls: number;
    criticalFindings: number;
    krisInBreach: number;
    overdueActions: number;
    totalActions: number;
  }): IcrOverallRating {
    const ineffectivePct = stats.totalControls ? stats.ineffectiveControls / stats.totalControls : 0;
    const overdueActionPct = stats.totalActions ? stats.overdueActions / stats.totalActions : 0;

    if (
      ineffectivePct >= 0.2 ||
      stats.criticalFindings >= 2 ||
      stats.krisInBreach >= 3 ||
      overdueActionPct >= 0.3
    ) return IcrOverallRating.UNSATISFACTORY;

    if (
      ineffectivePct >= 0.1 ||
      stats.criticalFindings >= 1 ||
      stats.krisInBreach >= 1 ||
      overdueActionPct >= 0.15
    ) return IcrOverallRating.NEEDS_IMPROVEMENT;

    return IcrOverallRating.SATISFACTORY;
  }
}
