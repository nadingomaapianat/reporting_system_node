import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

import type {
  AggregationScope,
  IcrAggregatedData,
  IcrActionPlanSummary,
  IcrControlSummary,
  IcrFindingSummary,
  IcrKriSummary,
  IcrRiskSummary,
  IcrStats,
  RcmEntry,
} from './interfaces/icr.interfaces';

const RATING_HIGH_THRESHOLD = 15;
const RATING_MEDIUM_THRESHOLD = 8;

@Injectable()
export class IcrDataAggregatorService {
  private readonly logger = new Logger(IcrDataAggregatorService.name);

  constructor(private readonly db: DatabaseService) {}

  async aggregate(scope: AggregationScope): Promise<IcrAggregatedData> {
    this.logger.log(
      `Aggregating ICR data: ${scope.periodFrom.toISOString()} → ${scope.periodTo.toISOString()}`,
    );

    const safeFetch = async <T>(name: string, fn: () => Promise<T[]>): Promise<T[]> => {
      try { return await fn(); }
      catch (err: any) {
        this.logger.error(
          `[ICR] ${name} query failed — snapshot will omit this dataset. ${err?.message ?? err}`,
          err?.stack,
        );
        return [];
      }
    };

    const [risks, controls, findings, actionPlans, kris] = await Promise.all([
      safeFetch('risks', () => this.fetchRisks(scope)),
      safeFetch('controls', () => this.fetchControls(scope)),
      safeFetch('findings', () => this.fetchFindings(scope)),
      safeFetch('actionPlans', () => this.fetchActionPlans(scope)),
      safeFetch('kris', () => this.fetchKris(scope)),
    ]);

    const riskControlMatrix = this.buildRiskControlMatrix(risks, controls, findings, actionPlans);
    const stats = this.computeStats(risks, controls, findings, actionPlans, kris, scope.periodTo);

    this.logger.log(
      `Aggregation complete — risks:${risks.length} controls:${controls.length} ` +
      `findings:${findings.length} actions:${actionPlans.length} kris:${kris.length}`,
    );

    return {
      risks,
      controls,
      findings,
      actionPlans,
      kris,
      riskControlMatrix,
      stats,
      generatedAt: new Date().toISOString(),
    };
  }

  // NOTE: The SQL queries below use table/column names derived from the existing
  // GRC module (dbo.[Risks], dbo.[Controls], etc.). Column names may need
  // adjustment to match your exact database schema.

  private async fetchRisks(scope: AggregationScope): Promise<IcrRiskSummary[]> {
    const conditions: string[] = ['r.isDeleted = 0 AND r.deletedAt IS NULL'];
    const params: any[] = [scope.periodFrom.toISOString(), scope.periodTo.toISOString()];
    let paramIdx = 2;

    conditions.push(`r.createdAt >= @param0 AND r.createdAt <= @param1`);

    if (scope.riskCategoryIds?.length) {
      const placeholders = scope.riskCategoryIds.map((_, i) => `@param${paramIdx + i}`).join(',');
      conditions.push(`r.event IN (${placeholders})`);
      params.push(...scope.riskCategoryIds);
      paramIdx += scope.riskCategoryIds.length;
    }

    if (scope.businessUnitIds?.length) {
      const placeholders = scope.businessUnitIds.map((_, i) => `@param${paramIdx + i}`).join(',');
      conditions.push(`r.function_id IN (${placeholders})`);
      params.push(...scope.businessUnitIds);
      paramIdx += scope.businessUnitIds.length;
    }

    if (scope.riskRatingMinLabel) {
      const levelMap: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
      const minLevel = levelMap[scope.riskRatingMinLabel];
      if (minLevel) {
        conditions.push(
          `(CASE LOWER(ISNULL(rr.residual_value, ''))
              WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 ELSE 0
            END) >= @param${paramIdx}`,
        );
        params.push(minLevel);
        paramIdx++;
      }
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT
        r.id,
        r.name,
        r.description,
        ISNULL(et.name, 'Uncategorized') AS categoryName,
        NULL AS subcategory,
        ISNULL(u.name, 'Unassigned') AS ownerName,
        ISNULL(r.inherent_frequency, 0) AS inherentLikelihood,
        ISNULL(r.inherent_financial_value, 0) AS inherentImpact,
        ISNULL(rr.residual_frequency, 0) AS residualLikelihood,
        ISNULL(rr.residual_financial_value, 0) AS residualImpact,
        rr.residual_value AS residualValue,
        rr.residual_value AS residual_value,
        r.event AS event,
        r.created_by AS created_by,
        r.createdAt AS lastAssessedAt,
        (SELECT COUNT(*) FROM dbo.[RiskControls] rc
         WHERE rc.risk_id = r.id AND rc.deletedAt IS NULL) AS controlCount,
        (SELECT COUNT(*) FROM dbo.[RiskIncidents] ri
         INNER JOIN dbo.[Incidents] inc ON ri.incident_id = inc.id
           AND inc.isDeleted = 0 AND inc.deletedAt IS NULL
         WHERE ri.risk_id = r.id AND ri.deletedAt IS NULL
           AND LOWER(ISNULL(inc.status, '')) <> 'closed') AS openFindingCount
      FROM dbo.[Risks] r
      LEFT JOIN dbo.[Residualrisks] rr ON rr.riskId = r.id AND rr.isDeleted = 0
      LEFT JOIN dbo.[EventTypes] et ON r.event = et.id
      LEFT JOIN users u ON r.created_by = u.id AND u.deletedAt IS NULL
      WHERE ${whereClause}
      ORDER BY CASE LOWER(ISNULL(rr.residual_value, ''))
                 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
               END DESC, r.name ASC
    `;

    const rows = await this.db.query(sql, params);
    return (rows || []).map((r: any) => this.shapeRisk(r));
  }

  private async fetchControls(scope: AggregationScope): Promise<IcrControlSummary[]> {
    const conditions: string[] = ['c.isDeleted = 0 AND c.deletedAt IS NULL'];
    const params: any[] = [scope.periodFrom.toISOString(), scope.periodTo.toISOString()];
    let paramIdx = 2;

    conditions.push(`c.createdAt >= @param0 AND c.createdAt <= @param1`);

    if (scope.controlOwnerIds?.length) {
      const placeholders = scope.controlOwnerIds.map((_, i) => `@param${paramIdx + i}`).join(',');
      conditions.push(`c.created_by IN (${placeholders})`);
      params.push(...scope.controlOwnerIds);
      paramIdx += scope.controlOwnerIds.length;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT
        c.id,
        c.name,
        c.description,
        CAST(
          CASE
            WHEN NULLIF(LTRIM(RTRIM(CAST(ISNULL(c.[code], N'') AS NVARCHAR(512)))), N'') IS NOT NULL
              THEN LTRIM(RTRIM(CAST(c.[code] AS NVARCHAR(512))))
            ELSE LTRIM(RTRIM(CAST(c.[id] AS NVARCHAR(64))))
          END
        AS NVARCHAR(512)) AS code,
        ISNULL(c.type, 'PREVENTIVE') AS type,
        ISNULL(c.frequency, 'MONTHLY') AS frequency,
        'NOT_TESTED' AS effectiveness,
        ISNULL(u.name, 'Unassigned') AS ownerName,
        (SELECT COUNT(*) FROM dbo.[RiskControls] rc2
         INNER JOIN dbo.[RiskIncidents] ri ON ri.risk_id = rc2.risk_id AND ri.deletedAt IS NULL
         INNER JOIN dbo.[Incidents] inc ON ri.incident_id = inc.id
           AND inc.isDeleted = 0 AND inc.deletedAt IS NULL
         WHERE rc2.control_id = c.id AND rc2.deletedAt IS NULL
           AND LOWER(ISNULL(inc.status, '')) <> 'closed') AS openFindingCount
      FROM dbo.[Controls] c
      LEFT JOIN users u ON c.created_by = u.id AND u.deletedAt IS NULL
      WHERE ${whereClause}
      ORDER BY c.name ASC
    `;

    const rows = await this.db.query(sql, params);

    // Fetch linked risk IDs/names for each control
    const controlIds = (rows || []).map((r: any) => r.id);
    let riskLinks: any[] = [];
    if (controlIds.length) {
      const linkSql = `
        SELECT rc.control_id, r.id AS risk_id, r.name AS risk_name
        FROM dbo.[RiskControls] rc
        INNER JOIN dbo.[Risks] r ON rc.risk_id = r.id AND r.isDeleted = 0 AND r.deletedAt IS NULL
        WHERE rc.deletedAt IS NULL AND rc.control_id IN (${controlIds.map((_: any, i: number) => `@param${i}`).join(',')})
      `;
      riskLinks = await this.db.query(linkSql, controlIds) || [];
    }

    return (rows || []).map((c: any) => {
      const linked = riskLinks.filter((l: any) => l.control_id === c.id);
      return this.shapeControl(c, linked);
    });
  }

  private async fetchFindings(scope: AggregationScope): Promise<IcrFindingSummary[]> {
    const conditions: string[] = [
      'i.isDeleted = 0 AND i.deletedAt IS NULL',
    ];
    const params: any[] = [scope.periodFrom.toISOString(), scope.periodTo.toISOString()];
    let paramIdx = 2;

    conditions.push(`i.createdAt >= @param0 AND i.createdAt <= @param1`);

    // includeClosedFindings — commented out: findings source (EffectiveFindings / AdequateFindings) has no open/closed status
    // if (!scope.includeClosedFindings) {
    //   conditions.push(`LOWER(ISNULL(i.status, '')) <> 'closed'`);
    // }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT
        i.id,
        i.title,
        CAST(ISNULL(i.description, '') AS NVARCHAR(MAX)) AS description,
        ISNULL(i.importance, 'MEDIUM') AS severity,
        ISNULL(i.status, 'OPEN') AS status,
        ri_first.risk_id AS riskId,
        r.name AS riskName,
        NULL AS controlId,
        NULL AS controlName,
        ISNULL(u.name, 'Unassigned') AS ownerName,
        NULL AS dueDate,
        NULL AS closedAt,
        i.createdAt,
        (SELECT COUNT(*) FROM dbo.[Actionplans] ap
         WHERE ap.incident_id = i.id AND ap.deletedAt IS NULL
           AND ap.done = 0
           AND LTRIM(RTRIM(ISNULL(ap.[from], ''))) = 'incident'
        ) AS openActionCount
      FROM dbo.[Incidents] i
      LEFT JOIN (
        SELECT incident_id, MIN(risk_id) AS risk_id
        FROM dbo.[RiskIncidents] WHERE deletedAt IS NULL
        GROUP BY incident_id
      ) ri_first ON ri_first.incident_id = i.id
      LEFT JOIN dbo.[Risks] r ON ri_first.risk_id = r.id AND r.isDeleted = 0
      LEFT JOIN users u ON i.created_by = u.id AND u.deletedAt IS NULL
      WHERE ${whereClause}
      ORDER BY
        CASE i.importance
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5 END ASC,
        i.createdAt ASC
    `;

    const rows = await this.db.query(sql, params);
    const today = new Date();
    return (rows || []).map((f: any) => this.shapeFinding(f, today));
  }

  private async fetchActionPlans(scope: AggregationScope): Promise<IcrActionPlanSummary[]> {
    const sql = `
      SELECT
        a.id,
        a.control_procedure AS description,
        a.incident_id AS findingId,
        ISNULL(i.title, N'—') AS findingTitle,
        ISNULL(f_owner.name, 'Unassigned') AS ownerName,
        a.implementation_date AS dueDate,
        CASE WHEN a.done = 1 THEN 'COMPLETED'
             ELSE ISNULL(a.business_unit, 'OPEN') END AS status,
        a.doneAt AS completedAt
      FROM dbo.[Actionplans] a
      LEFT JOIN dbo.[Incidents] i ON a.incident_id = i.id
      LEFT JOIN dbo.[Functions] f_owner ON a.actionOwner = f_owner.id
        AND f_owner.isDeleted = 0 AND f_owner.deletedAt IS NULL
      WHERE a.deletedAt IS NULL
        AND LTRIM(RTRIM(ISNULL(a.[from], ''))) = 'incident'
        AND (a.implementation_date IS NULL OR a.implementation_date <= @param0)
      ORDER BY a.implementation_date ASC
    `;

    const rows = await this.db.query(sql, [scope.periodTo.toISOString()]);
    const today = new Date();
    return (rows || []).map((a: any) => this.shapeActionPlan(a, today));
  }

  private async fetchKris(scope: AggregationScope): Promise<IcrKriSummary[]> {
    const sql = `
      SELECT
        k.id,
        k.kriName AS name,
        kr_first.risk_id AS riskId,
        r.name AS riskName,
        k.threshold,
        k.medium_from AS warningLevel,
        ISNULL(k.typePercentageOrFigure, '') AS unit,
        latestVal.value AS currentValue,
        latestVal.trend,
        latestVal.recordedAt AS lastUpdated
      FROM dbo.[Kris] k
      LEFT JOIN (
        SELECT kri_id, MIN(risk_id) AS risk_id
        FROM dbo.[KriRisks] WHERE deletedAt IS NULL
        GROUP BY kri_id
      ) kr_first ON kr_first.kri_id = k.id
      LEFT JOIN dbo.[Risks] r ON kr_first.risk_id = r.id AND r.isDeleted = 0
      OUTER APPLY (
        SELECT TOP 1
          kv.value,
          kv.assessment AS trend,
          CONVERT(datetime, CONCAT(kv.[year], '-', RIGHT('0' + CAST(kv.[month] AS VARCHAR), 2), '-01')) AS recordedAt
        FROM dbo.[KriValues] kv
        WHERE kv.kriId = k.id
          AND kv.deletedAt IS NULL
          AND CONVERT(datetime, CONCAT(kv.[year], '-', RIGHT('0' + CAST(kv.[month] AS VARCHAR), 2), '-01')) >= @param0
          AND CONVERT(datetime, CONCAT(kv.[year], '-', RIGHT('0' + CAST(kv.[month] AS VARCHAR), 2), '-01')) <= @param1
        ORDER BY kv.[year] DESC, kv.[month] DESC
      ) latestVal
      WHERE k.isDeleted = 0 AND k.deletedAt IS NULL
        AND latestVal.recordedAt IS NOT NULL
      ORDER BY
        CASE WHEN latestVal.value IS NOT NULL
          AND TRY_CAST(k.threshold AS FLOAT) IS NOT NULL
          AND latestVal.value >= TRY_CAST(k.threshold AS FLOAT) THEN 0 ELSE 1 END ASC,
        k.kriName ASC
    `;

    const rows = await this.db.query(sql, [
      scope.periodFrom.toISOString(),
      scope.periodTo.toISOString(),
    ]);
    return (rows || []).map((k: any) => this.shapeKri(k));
  }

  private shapeRisk(r: any): IcrRiskSummary {
    const inherentLikelihood = Number(r.inherentLikelihood) || 0;
    const inherentImpact = Number(r.inherentImpact) || 0;
    const residualLikelihood = Number(r.residualLikelihood) || 0;
    const residualImpact = Number(r.residualImpact) || 0;
    const inherentRating = inherentLikelihood * inherentImpact;
    const residualValueStr = (r.residualValue ?? '').toString().toLowerCase();
    const residualRating = residualValueStr === 'high' ? 15
      : residualValueStr === 'medium' ? 8
      : residualValueStr === 'low' ? 3
      : (residualLikelihood * residualImpact);

    const base: Record<string, unknown> = {
      id: r.id,
      name: r.name ?? '',
      description: r.description ?? '',
      category: r.categoryName ?? 'Uncategorized',
      subcategory: r.subcategory ?? null,
      owner: r.ownerName ?? 'Unassigned',
      inherentLikelihood,
      inherentImpact,
      inherentRating,
      residualLikelihood,
      residualImpact,
      residualRating,
      residualRatingLabel: residualValueStr === 'high' ? 'High'
        : residualValueStr === 'medium' ? 'Medium'
        : residualValueStr === 'low' ? 'Low'
        : this.ratingLabel(residualRating),
      riskReduction: Math.max(0, inherentRating - residualRating),
      controlCount: Number(r.controlCount) || 0,
      openFindingCount: Number(r.openFindingCount) || 0,
      openActionCount: 0,
      lastAssessedAt: r.lastAssessedAt
        ? new Date(r.lastAssessedAt).toISOString()
        : null,
    };

    // Passthrough dbo.Risks fields that are always selected above (avoid optional columns that may not exist on every DB).
    const passthroughKeys = [
      'event',
      'created_by',
      'residual_value',
    ];
    for (const k of passthroughKeys) {
      if (r[k] === undefined) continue;
      if (base[k] === undefined) {
        base[k] = r[k];
      }
    }
    if (r.residualValue !== undefined && base.residual_value === undefined) {
      base.residual_value = r.residualValue;
    }

    return base as unknown as IcrRiskSummary;
  }

  /**
   * dbo.Controls / driver quirks: code may arrive as code, Code, or alternate physical names.
   * If still empty, fall back to control id so ICR tables are never a blank "code" column.
   */
  private resolveControlCode(c: any): string {
    const direct =
      c?.code ??
      c?.Code ??
      c?.CODE ??
      c?.controlCode ??
      c?.ControlCode ??
      c?.control_code;

    const normalize = (v: unknown): string => {
      if (v == null) return '';
      if (typeof v === 'string') return v.trim();
      if (typeof v === 'number' || typeof v === 'bigint') return String(v).trim();
      return String(v).trim();
    };

    let s = normalize(direct);
    if (s) return s;

    if (c && typeof c === 'object') {
      const keys = Object.keys(c);
      const hit = keys.find(
        (k) =>
          k.toLowerCase() === 'code' ||
          k.toLowerCase() === 'controlcode' ||
          k.toLowerCase() === 'control_code',
      );
      if (hit) {
        s = normalize(c[hit]);
        if (s) return s;
      }
    }

    if (c?.id != null && c.id !== '') {
      return String(c.id).trim();
    }

    return '';
  }

  private shapeControl(c: any, riskLinks: any[]): IcrControlSummary {
    const code = this.resolveControlCode(c);

    return {
      id: c.id,
      name: c.name ?? '',
      description: c.description ?? '',
      code,
      type: c.type ?? 'PREVENTIVE',
      frequency: c.frequency ?? 'MONTHLY',
      effectiveness: c.effectiveness ?? 'NOT_TESTED',
      owner: c.ownerName ?? 'Unassigned',
      linkedRiskIds: riskLinks.map((l: any) => l.risk_id),
      linkedRiskNames: riskLinks.map((l: any) => l.risk_name),
      openFindingCount: Number(c.openFindingCount) || 0,
    };
  }

  private shapeFinding(f: any, today: Date): IcrFindingSummary {
    const createdAt = new Date(f.createdAt);
    const daysOpen = Math.floor(
      (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      id: f.id,
      title: f.title ?? '',
      description: f.description ?? '',
      severity: f.severity ?? 'MEDIUM',
      status: f.status ?? 'OPEN',
      riskId: f.riskId ?? null,
      riskName: f.riskName ?? null,
      controlId: f.controlId ?? null,
      controlName: f.controlName ?? null,
      owner: f.ownerName ?? 'Unassigned',
      dueDate: f.dueDate
        ? new Date(f.dueDate).toISOString().slice(0, 10)
        : null,
      closedAt: f.closedAt
        ? new Date(f.closedAt).toISOString().slice(0, 10)
        : null,
      createdAt: createdAt.toISOString().slice(0, 10),
      daysOpen,
      openActionCount: Number(f.openActionCount) || 0,
    };
  }

  private shapeActionPlan(a: any, today: Date): IcrActionPlanSummary {
    const dueDate = a.dueDate ? new Date(a.dueDate) : new Date();
    const status = String(a.status ?? 'OPEN').toUpperCase();
    const isOverdue =
      status !== 'COMPLETED' && status !== 'CANCELLED' && dueDate < today;

    return {
      id: a.id,
      description: a.description ?? '',
      findingId: a.findingId ?? 0,
      findingTitle: a.findingTitle ?? '—',
      owner: a.ownerName ?? 'Unassigned',
      dueDate: dueDate.toISOString().slice(0, 10),
      status,
      isOverdue,
      completedAt: a.completedAt
        ? new Date(a.completedAt).toISOString().slice(0, 10)
        : null,
    };
  }

  private shapeKri(k: any): IcrKriSummary {
    const currentValue = k.currentValue != null ? Number(k.currentValue) : null;
    const threshold = Number(k.threshold) || 0;
    const warningLevel = k.warningLevel != null ? Number(k.warningLevel) : null;
    const status = this.resolveKriStatus(currentValue, threshold, warningLevel);
    const trend = (k.trend as IcrKriSummary['trend']) ?? 'UNKNOWN';

    return {
      id: k.id,
      name: k.name ?? '',
      riskId: k.riskId ?? null,
      riskName: k.riskName ?? null,
      currentValue,
      threshold,
      warningLevel,
      unit: k.unit ?? '',
      status,
      trend,
      lastUpdated: k.lastUpdated
        ? new Date(k.lastUpdated).toISOString().slice(0, 10)
        : null,
    };
  }

  private buildRiskControlMatrix(
    risks: IcrRiskSummary[],
    controls: IcrControlSummary[],
    findings: IcrFindingSummary[],
    actionPlans: IcrActionPlanSummary[],
  ): RcmEntry[] {
    return risks.map((risk): RcmEntry => {
      const linkedControls = controls.filter((c) =>
        c.linkedRiskIds.includes(risk.id),
      );
      const linkedFindings = findings.filter((f) => f.riskId === risk.id);
      const linkedActions = actionPlans.filter((a) =>
        linkedFindings.some((f) => f.id === a.findingId),
      );

      return {
        riskId: risk.id,
        riskName: risk.name,
        riskCategory: risk.category,
        riskRating: risk.residualRatingLabel,
        inherentRisk: risk.inherentRating,
        residualRisk: risk.residualRating,
        controls: linkedControls.map((c) => ({
          controlId: c.id,
          controlName: c.name,
          controlType: c.type,
          effectiveness: c.effectiveness,
          frequency: c.frequency,
          owner: c.owner,
        })),
        openFindings: linkedFindings.filter((f) => f.status !== 'CLOSED').length,
        openActions: linkedActions.filter(
          (a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED',
        ).length,
      };
    });
  }

  private computeStats(
    risks: IcrRiskSummary[],
    controls: IcrControlSummary[],
    findings: IcrFindingSummary[],
    actionPlans: IcrActionPlanSummary[],
    kris: IcrKriSummary[],
    _asOfDate: Date,
  ): IcrStats {
    const highRisks = risks.filter((r) => r.residualRating >= RATING_HIGH_THRESHOLD).length;
    const mediumRisks = risks.filter(
      (r) => r.residualRating >= RATING_MEDIUM_THRESHOLD && r.residualRating < RATING_HIGH_THRESHOLD,
    ).length;
    const lowRisks = risks.filter((r) => r.residualRating < RATING_MEDIUM_THRESHOLD).length;

    const effectiveControls = controls.filter((c) => c.effectiveness === 'EFFECTIVE').length;
    const partiallyEffectiveControls = controls.filter((c) => c.effectiveness === 'PARTIALLY_EFFECTIVE').length;
    const ineffectiveControls = controls.filter((c) => c.effectiveness === 'INEFFECTIVE').length;
    const notTestedControls = controls.filter((c) => c.effectiveness === 'NOT_TESTED').length;
    const controlEffectivenessRate = controls.length
      ? Math.round((effectiveControls / controls.length) * 100)
      : 0;

    const openFindings = findings.filter((f) => f.status !== 'CLOSED').length;
    const criticalFindings = findings.filter((f) => f.severity === 'CRITICAL').length;
    const highFindings = findings.filter((f) => f.severity === 'HIGH').length;
    const mediumFindings = findings.filter((f) => f.severity === 'MEDIUM').length;
    const lowFindings = findings.filter((f) => f.severity === 'LOW').length;
    const avgDaysOpen = openFindings
      ? Math.round(
          findings
            .filter((f) => f.status !== 'CLOSED')
            .reduce((sum, f) => sum + f.daysOpen, 0) / openFindings,
        )
      : 0;

    const nonCancelledActions = actionPlans.filter((a) => a.status !== 'CANCELLED');
    const completedActions = actionPlans.filter((a) => a.status === 'COMPLETED').length;
    const overdueActions = actionPlans.filter((a) => a.isOverdue).length;
    const actionCompletionRate = nonCancelledActions.length
      ? Math.round((completedActions / nonCancelledActions.length) * 100)
      : 0;

    const krisInBreach = kris.filter((k) => k.status === 'BREACH').length;
    const krisInWarning = kris.filter((k) => k.status === 'WARNING').length;

    return {
      totalRisks: risks.length,
      highRisks,
      mediumRisks,
      lowRisks,
      totalControls: controls.length,
      effectiveControls,
      partiallyEffectiveControls,
      ineffectiveControls,
      notTestedControls,
      controlEffectivenessRate,
      totalFindings: findings.length,
      openFindings,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
      avgDaysOpen,
      totalActions: actionPlans.length,
      completedActions,
      overdueActions,
      actionCompletionRate,
      totalKris: kris.length,
      krisInBreach,
      krisInWarning,
    };
  }

  private ratingLabel(rating: number): string {
    if (rating >= RATING_HIGH_THRESHOLD) return 'High';
    if (rating >= RATING_MEDIUM_THRESHOLD) return 'Medium';
    return 'Low';
  }

  private resolveKriStatus(
    value: number | null,
    threshold: number,
    warningLevel: number | null,
  ): IcrKriSummary['status'] {
    if (value === null) return 'NO_DATA';
    if (value >= threshold) return 'BREACH';
    if (warningLevel !== null && value >= warningLevel) return 'WARNING';
    return 'WITHIN_LIMIT';
  }
}
