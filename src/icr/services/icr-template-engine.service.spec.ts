import { IcrFramework, IcrReportRecord, IcrStatus } from '../interfaces/icr-report.types';
import { IcrSectionType } from '../interfaces/icr-section.types';
import type { IcrAggregatedData, IcrRiskSummary, IcrStats } from './interfaces/icr.interfaces';
import { IcrTemplateEngineService } from './icr-template-engine.service';

function mockRisk(over: Partial<IcrRiskSummary> = {}): IcrRiskSummary {
  return {
    id: 1,
    name: 'Sample risk',
    description: '',
    category: 'Event',
    subcategory: null,
    owner: 'Owner',
    inherentLikelihood: 3,
    inherentImpact: 4,
    inherentRating: 12,
    residualLikelihood: 2,
    residualImpact: 3,
    residualRating: 15,
    residualRatingLabel: 'High',
    riskReduction: 0,
    controlCount: 1,
    openFindingCount: 0,
    openActionCount: 0,
    lastAssessedAt: null,
    ...over,
  };
}

function emptyStats(over: Partial<IcrStats> = {}): IcrStats {
  return {
    totalRisks: 0,
    highRisks: 0,
    mediumRisks: 0,
    lowRisks: 0,
    totalControls: 0,
    effectiveControls: 0,
    partiallyEffectiveControls: 0,
    ineffectiveControls: 0,
    notTestedControls: 0,
    controlEffectivenessRate: 0,
    totalFindings: 0,
    openFindings: 0,
    criticalFindings: 0,
    highFindings: 0,
    mediumFindings: 0,
    lowFindings: 0,
    avgDaysOpen: 0,
    totalActions: 0,
    completedActions: 0,
    overdueActions: 0,
    actionCompletionRate: 0,
    totalKris: 100,
    krisInBreach: 0,
    krisInWarning: 0,
    ...over,
  };
}

function baseReport(): IcrReportRecord {
  return {
    id: 12,
    title: 'Test ICR',
    reportingPeriod: 'Q1 2026',
    periodFrom: '2026-01-01T00:00:00.000Z',
    periodTo: '2026-03-31T00:00:00.000Z',
    framework: IcrFramework.COSO,
    reportMode: null,
    businessUnit: null,
    division: null,
    templateId: 1,
    status: IcrStatus.DRAFT,
    overallRating: null,
    approvalChain: null,
    scopeFilters: null,
    reportSnapshot: null,
    version: 1,
    lastRegeneratedAt: null,
    lastRegeneratedBy: null,
    auditTrail: [],
    createdAt: '',
    updatedAt: '',
    createdById: 'u1',
    createdByName: 'Tester',
    updatedById: null,
    updatedByName: null,
  };
}

describe('IcrTemplateEngineService', () => {
  const engine = new IcrTemplateEngineService();

  it('buildRiskAssessment maps stats, distribution, and top risks', () => {
    const risks: IcrRiskSummary[] = [
      mockRisk({ id: 1, name: 'High A', residualRatingLabel: 'High', residualRating: 15 }),
      mockRisk({ id: 2, name: 'High B', residualRatingLabel: 'High', residualRating: 14 }),
      mockRisk({ id: 3, name: 'Med C', residualRatingLabel: 'Medium', residualRating: 10 }),
    ];
    const stats = emptyStats({
      totalRisks: 1007,
      highRisks: 10,
      mediumRisks: 21,
      lowRisks: 976,
      totalKris: 836,
      krisInBreach: 811,
    });
    const data: IcrAggregatedData = {
      risks,
      controls: [],
      findings: [],
      actionPlans: [],
      kris: [],
      riskControlMatrix: [],
      stats,
      generatedAt: new Date().toISOString(),
    };

    const out = engine.buildRiskAssessment(baseReport(), data);

    expect(out.sectionType).toBe(IcrSectionType.RISK_ASSESSMENT);
    const c = out.content as Record<string, unknown>;
    expect(c.stats).toEqual({
      totalRisks: 1007,
      highRisks: 10,
      mediumRisks: 21,
      lowRisks: 976,
    });
    expect(Array.isArray(c.ratingDistribution)).toBe(true);
    expect((c.ratingDistribution as { label: string }[]).map((x) => x.label)).toEqual([
      'High',
      'Medium',
      'Low',
    ]);
    const top = c.topRisks as Array<{ rank: number; name: string }>;
    expect(top).toHaveLength(3);
    expect(top[0].rank).toBe(1);
    expect(top[0].name).toBe('High A');
    expect(typeof c.summary).toBe('string');
    expect((c.summary as string)).toContain('1007');
    expect((c.summary as string)).toContain('Q1 2026');
  });
});
