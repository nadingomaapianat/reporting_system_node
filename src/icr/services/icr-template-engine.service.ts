import { Injectable } from '@nestjs/common';
import { IcrReportRecord, IcrFramework } from '../interfaces/icr-report.types';
import { IcrSectionType } from '../interfaces/icr-section.types';
import type {
  IcrAggregatedData,
  IcrControlSummary,
  IcrFindingSummary,
  IcrRiskSummary,
  IcrStats,
  RcmEntry,
  SectionOutput,
} from './interfaces/icr.interfaces';

interface IntroductionContent {
  bankName: string;
  reportTitle: string;
  reportingPeriod: string;
  framework: string;
  frameworkFull: string;
  businessUnit: string;
  preparedBy: string;
  reviewedBy: string;
  purposeStatement: string;
  scopeStatement: string;
  exclusionsStatement: string;
  methodologyPoints: string[];
  cosoComponents: CosoComponent[];
}

interface CosoComponent {
  component: string;
  description: string;
  bankContext: string;
}

interface RiskAssessmentContent {
  summary: string;
  stats: {
    totalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
  };
  ratingDistribution: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
  topRisks: Array<{
    rank: number;
    name: string;
    category: string;
    inherentRating: number;
    residualRating: number;
    riskReduction: number;
    controlCount: number;
    ratingLabel: string;
    openFindings: number;
  }>;
  unmitigatedRisks: number;
  krisInBreach: number;
  trendStatement: string;
  managementFocus: string[];
}

interface ControlActivitiesContent {
  summary: string;
  effectivenessSummary: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
  effectivenessRate: number;
  controlsByType: Array<{
    type: string;
    count: number;
    label: string;
  }>;
  weakControls: Array<{
    controlId: number;
    controlName: string;
    effectiveness: string;
    linkedRisks: string;
    owner: string;
    recommendation: string;
  }>;
  rcmTable: RcmEntry[];
  coverageGaps: string[];
  managementActions: string[];
}

interface FindingsContent {
  summary: string;
  criticalCount: number;
  openCount: number;
  avgDaysOpen: number;
  overdueActionCount: number;
  findingsBySeverity: Array<{
    severity: string;
    count: number;
    percentage: number;
  }>;
  findingsTable: Array<{
    id: number;
    title: string;
    severity: string;
    status: string;
    riskName: string;
    controlName: string;
    owner: string;
    dueDate: string;
    daysOpen: number;
    openActions: number;
  }>;
  actionPlanSummary: Array<{
    actionId: number;
    description: string;
    findingTitle: string;
    owner: string;
    dueDate: string;
    status: string;
    isOverdue: boolean;
  }>;
  priorityRecommendations: string[];
}

const BANK_NAME = 'Abu Dhabi Islamic Bank (ADIB)';
const BANK_SHORT = 'ADIB';
const REGULATORY_BODY = 'UAE Central Bank (CBUAE)';

const FRAMEWORK_LABELS: Record<string, string> = {
  [IcrFramework.COSO]: 'COSO 2013 Internal Control — Integrated Framework',
  [IcrFramework.ISO31000]: 'ISO 31000:2018 Risk Management',
  [IcrFramework.COBIT]: 'COBIT 2019',
};

const CONTROL_TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: 'Preventive',
  DETECTIVE: 'Detective',
  CORRECTIVE: 'Corrective',
  DIRECTIVE: 'Directive',
  COMPENSATING: 'Compensating',
};

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

@Injectable()
export class IcrTemplateEngineService {

  buildAllSections(report: IcrReportRecord, data: IcrAggregatedData): SectionOutput[] {
    return [
      this.buildIntroduction(report, data),
      this.buildScopeAndMethodology(report),
      this.buildCosoOverview(report),
      this.buildRiskAssessment(report, data),
      this.buildControlActivities(report, data),
      this.buildRcm(data),
      this.buildFindings(report, data),
      this.buildActionPlans(data),
      this.buildKriDashboard(data),
      this.buildConclusion(report, data),
    ];
  }

  buildIntroduction(report: IcrReportRecord, data: IcrAggregatedData): SectionOutput {
    const frameworkFull = this.resolveFrameworkLabel(report.framework);
    const businessUnit = report.businessUnit ?? 'Enterprise-wide';

    const content: IntroductionContent = {
      bankName: BANK_NAME,
      reportTitle: report.title,
      reportingPeriod: report.reportingPeriod,
      framework: report.framework,
      frameworkFull,
      businessUnit,
      preparedBy: report.approvalChain?.preparedBy ?? '',
      reviewedBy: report.approvalChain?.reviewedBy ?? '',
      purposeStatement: this.buildPurposeStatement(report, businessUnit, frameworkFull),
      scopeStatement: this.buildIntroScopeStatement(report, data),
      exclusionsStatement: this.buildExclusionsStatement(report),
      methodologyPoints: this.buildMethodologyPoints(report, frameworkFull),
      cosoComponents: this.buildCosoComponentList(),
    };

    return this.section(IcrSectionType.INTRODUCTION, '1. Introduction', 1, content);
  }

  private buildPurposeStatement(
    report: IcrReportRecord,
    businessUnit: string,
    frameworkFull: string,
  ): string {
    return (
      `This Internal Control Report (ICR) has been prepared for ${businessUnit} ` +
      `covering the period ${report.reportingPeriod}. ` +
      `The purpose of this report is to provide senior management and the Board Risk Committee ` +
      `with an objective, evidence-based assessment of the internal control environment ` +
      `as at the reporting date. ` +
      `The report identifies control deficiencies, risk exposures, and material findings, ` +
      `and tracks the status of associated remediation activities, ` +
      `in alignment with the ${frameworkFull} and the requirements of ${REGULATORY_BODY}.`
    );
  }

  private buildIntroScopeStatement(
    report: IcrReportRecord,
    data: IcrAggregatedData,
  ): string {
    const filters = report.scopeFilters ?? {};
    const statements = [
      `The scope of this review encompasses ${data.risks.length} risks, ` +
      `${data.controls.length} controls, and ${data.findings.length} findings ` +
      `recorded within the ${BANK_SHORT} GRC system for ${report.reportingPeriod}.`,
    ];

    if (filters.riskRatingMin !== undefined) {
      statements.push(
        `Only risks with a residual rating of ${filters.riskRatingMin} or above ` +
        `have been included in this assessment.`,
      );
    }
    if (!filters.includeClosedFindings) {
      statements.push(
        `Findings with a status of Closed prior to the reporting period ` +
        `have been excluded from this analysis.`,
      );
    }

    return statements.join(' ');
  }

  private buildExclusionsStatement(report: IcrReportRecord): string {
    const filters = report.scopeFilters ?? {};
    const exclusions: string[] = [];

    if (filters.includeClosedFindings === false) {
      exclusions.push('closed findings');
    }
    if (!filters.riskCategoryIds?.length) {
      exclusions.push('operational and strategic risks outside the defined category scope');
    }

    if (!exclusions.length) {
      return 'No explicit exclusions were applied to this report.';
    }

    return (
      `The following have been excluded from this assessment: ` +
      exclusions.join('; ') +
      `. These exclusions are documented in the scope filters maintained in the GRC system.`
    );
  }

  private buildMethodologyPoints(report: IcrReportRecord, frameworkFull: string): string[] {
    return [
      `Review of the risk register and all linked control documentation within the ${BANK_SHORT} GRC system.`,
      `Assessment of control effectiveness based on testing results, documented evidence, and owner attestations.`,
      `Analysis of all findings, issues, and control gaps identified during ${report.reportingPeriod}.`,
      `Evaluation of action plan status and measurement of remediation progress against agreed due dates.`,
      `Risk-rated prioritisation of all findings using ${BANK_SHORT}'s approved risk appetite thresholds.`,
      `Application of all five components and seventeen principles of the ${frameworkFull} as the evaluative structure.`,
      `Cross-referencing with Key Risk Indicator (KRI) data to validate residual risk ratings.`,
    ];
  }

  private buildCosoComponentList(): CosoComponent[] {
    return [
      {
        component: 'Control Environment',
        description: 'The foundation for all other COSO components — encompasses the tone of the organisation, integrity, ethical values, and the commitment to competence.',
        bankContext: `${BANK_SHORT} maintains a documented Code of Conduct, Board-approved risk appetite statement, and a three-lines-of-defence governance model.`,
      },
      {
        component: 'Risk Assessment',
        description: 'Identification and analysis of risks relevant to achieving the bank\'s objectives, forming the basis for determining how risks should be managed.',
        bankContext: `Risks are assessed on a quarterly basis using a 5×5 likelihood/impact matrix and are maintained in the GRC system.`,
      },
      {
        component: 'Control Activities',
        description: 'Policies, procedures, and actions that help ensure management directives to mitigate risks to acceptable levels are carried out.',
        bankContext: `Controls are classified as Preventive, Detective, or Corrective and are tested on a defined frequency by the second line of defence.`,
      },
      {
        component: 'Information & Communication',
        description: 'Systems and processes that support the identification, capture, and exchange of relevant, quality information in a timeframe that enables people to carry out their responsibilities.',
        bankContext: `Risk and control information is maintained in real time within the GRC system and reported monthly to the Risk Management Committee.`,
      },
      {
        component: 'Monitoring Activities',
        description: 'Ongoing evaluations, separate evaluations, or some combination of the two used to ascertain whether each of the five components is present and functioning.',
        bankContext: `Internal Audit conducts annual control testing cycles; operational management performs continuous monitoring via KRIs and management dashboards.`,
      },
    ];
  }

  buildScopeAndMethodology(report: IcrReportRecord): SectionOutput {
    const frameworkFull = this.resolveFrameworkLabel(report.framework);
    return this.section(IcrSectionType.SCOPE_AND_METHODOLOGY, '2. Scope and Methodology', 2, {
      scopeStatement: this.buildExclusionsStatement(report),
      methodologyPoints: this.buildMethodologyPoints(report, frameworkFull),
      framework: frameworkFull,
      cosoComponents: this.buildCosoComponentList(),
    });
  }

  buildCosoOverview(report: IcrReportRecord): SectionOutput {
    return this.section(IcrSectionType.COSO_OVERVIEW, '3. COSO Framework Overview', 3, {
      frameworkFull: this.resolveFrameworkLabel(report.framework),
      components: this.buildCosoComponentList(),
      bankAlignment: (
        `${BANK_NAME} aligns its internal control framework with the ${this.resolveFrameworkLabel(report.framework)} ` +
        `as the primary evaluative standard. Each of the five components and seventeen principles ` +
        `is considered in the design, implementation, and monitoring of controls across all business ` +
        `units, in full alignment with ${REGULATORY_BODY} supervisory requirements and ` +
        `Basel III operational risk guidelines.`
      ),
    });
  }

  buildRiskAssessment(report: IcrReportRecord, data: IcrAggregatedData): SectionOutput {
    const { stats, risks } = data;
    const total = stats.totalRisks || 1;

    const ratingDistribution = [
      { label: 'High', count: stats.highRisks, percentage: pct(stats.highRisks, total) },
      { label: 'Medium', count: stats.mediumRisks, percentage: pct(stats.mediumRisks, total) },
      { label: 'Low', count: stats.lowRisks, percentage: pct(stats.lowRisks, total) },
    ];

    const topRisks = risks.slice(0, 10).map((r, i) => ({
      rank: i + 1,
      name: r.name,
      category: r.category,
      inherentRating: r.inherentRating,
      residualRating: r.residualRating,
      riskReduction: r.riskReduction,
      controlCount: r.controlCount,
      ratingLabel: r.residualRatingLabel,
      openFindings: r.openFindingCount,
    }));

    const unmitigatedRisks = risks.filter((r) => r.controlCount === 0).length;
    const managementFocus = this.buildRiskManagementFocus(stats, risks, unmitigatedRisks);

    const content: RiskAssessmentContent = {
      summary: this.buildRiskAssessmentSummary(report, stats, unmitigatedRisks),
      stats: {
        totalRisks: stats.totalRisks,
        highRisks: stats.highRisks,
        mediumRisks: stats.mediumRisks,
        lowRisks: stats.lowRisks,
      },
      ratingDistribution,
      topRisks,
      unmitigatedRisks,
      krisInBreach: stats.krisInBreach,
      trendStatement: this.buildKriTrendStatement(stats),
      managementFocus,
    };

    return this.section(IcrSectionType.RISK_ASSESSMENT, '4. Risk Assessment', 4, content);
  }

  private buildRiskAssessmentSummary(
    report: IcrReportRecord,
    stats: IcrStats,
    unmitigatedRisks: number,
  ): string {
    const total = stats.totalRisks || 1;
    const highPct = pct(stats.highRisks, total);
    const parts: string[] = [
      `As at ${report.reportingPeriod}, the ${BANK_SHORT} risk register contains ` +
      `${stats.totalRisks} risks across all assessed categories.`,

      `Of these, ${stats.highRisks} (${highPct}%) are rated High on a residual basis, ` +
      `${stats.mediumRisks} are rated Medium, and ${stats.lowRisks} are rated Low.`,
    ];

    if (unmitigatedRisks > 0) {
      parts.push(
        `${unmitigatedRisks} risk${unmitigatedRisks > 1 ? 's have' : ' has'} no mapped controls ` +
        `and require${unmitigatedRisks === 1 ? 's' : ''} immediate attention from risk owners.`,
      );
    }

    parts.push(this.buildKriTrendStatement(stats));
    parts.push(
      `Management attention is directed to the high-rated risks detailed in Table 4.2 below, ` +
      `particularly those with open critical findings or overdue remediation actions.`,
    );

    return parts.join(' ');
  }

  private buildKriTrendStatement(stats: IcrStats): string {
    const total = stats.totalKris || 1;
    const breachPct = pct(stats.krisInBreach, total);

    if (stats.krisInBreach === 0) {
      return (
        `Key Risk Indicator analysis indicates the risk environment is broadly within appetite — ` +
        `all ${stats.totalKris} KRIs are operating within defined threshold limits.`
      );
    }
    if (breachPct >= 30) {
      return (
        `Key Risk Indicator analysis indicates elevated risk conditions: ` +
        `${stats.krisInBreach} of ${stats.totalKris} KRIs (${breachPct}%) are in breach of ` +
        `approved thresholds, representing a heightened risk environment requiring escalation.`
      );
    }
    return (
      `Key Risk Indicator analysis shows moderate risk pressure: ` +
      `${stats.krisInBreach} of ${stats.totalKris} KRIs (${breachPct}%) are currently ` +
      `in breach of defined threshold limits.`
    );
  }

  private buildRiskManagementFocus(
    stats: IcrStats,
    risks: IcrRiskSummary[],
    unmitigatedRisks: number,
  ): string[] {
    const points: string[] = [];

    if (stats.highRisks > 0) {
      const highRiskNames = risks
        .filter((r) => r.residualRatingLabel === 'High')
        .slice(0, 3)
        .map((r) => r.name);
      points.push(
        `Priority monitoring of ${stats.highRisks} high-rated risk(s): ` +
        highRiskNames.join(', ') +
        (stats.highRisks > 3 ? ` and ${stats.highRisks - 3} others.` : '.'),
      );
    }
    if (unmitigatedRisks > 0) {
      points.push(
        `Immediate assignment of controls to ${unmitigatedRisks} risk(s) currently lacking mitigating controls.`,
      );
    }
    if (stats.krisInBreach > 0) {
      points.push(
        `Investigation and documented response plan for ${stats.krisInBreach} KRI(s) in breach of threshold.`,
      );
    }
    if (stats.criticalFindings > 0) {
      points.push(
        `Immediate remediation of ${stats.criticalFindings} critical finding(s) linked to high-rated risks.`,
      );
    }
    if (!points.length) {
      points.push('Continue monitoring current risk positions and maintain control standards.');
    }

    return points;
  }

  buildControlActivities(report: IcrReportRecord, data: IcrAggregatedData): SectionOutput {
    const { stats, controls, riskControlMatrix, risks } = data;
    const total = stats.totalControls || 1;

    const effectivenessSummary = [
      { label: 'Effective', count: stats.effectiveControls, percentage: pct(stats.effectiveControls, total) },
      { label: 'Partially Effective', count: stats.partiallyEffectiveControls, percentage: pct(stats.partiallyEffectiveControls, total) },
      { label: 'Ineffective', count: stats.ineffectiveControls, percentage: pct(stats.ineffectiveControls, total) },
      { label: 'Not Tested', count: stats.notTestedControls, percentage: pct(stats.notTestedControls, total) },
    ].filter((e) => e.count > 0);

    const controlsByType = this.groupControlsByType(controls);
    const weakControls = this.buildWeakControlsTable(controls, riskControlMatrix);
    const coverageGaps = this.identifyCoverageGaps(risks, riskControlMatrix);
    const managementActions = this.buildControlManagementActions(stats, weakControls.length);

    const content: ControlActivitiesContent = {
      summary: this.buildControlSummary(report, stats),
      effectivenessSummary,
      effectivenessRate: stats.controlEffectivenessRate,
      controlsByType,
      weakControls,
      rcmTable: riskControlMatrix,
      coverageGaps,
      managementActions,
    };

    return this.section(IcrSectionType.CONTROL_ACTIVITIES, '5. Control Activities', 5, content);
  }

  private buildControlSummary(report: IcrReportRecord, stats: IcrStats): string {
    const total = stats.totalControls || 1;
    const parts: string[] = [
      `The ${BANK_SHORT} control environment for ${report.reportingPeriod} ` +
      `comprises ${stats.totalControls} controls mapped across all assessed risks.`,

      `${stats.effectiveControls} controls (${pct(stats.effectiveControls, total)}%) ` +
      `were assessed as Effective, ${stats.partiallyEffectiveControls} as Partially Effective, ` +
      `and ${stats.ineffectiveControls} as Ineffective.`,
    ];

    if (stats.notTestedControls > 0) {
      parts.push(
        `${stats.notTestedControls} control(s) have not yet been tested ` +
        `and should be prioritised in the next testing cycle.`,
      );
    }
    if (stats.ineffectiveControls > 0) {
      parts.push(
        `Controls rated Ineffective represent immediate remediation priorities ` +
        `and are detailed in Table 5.3 below.`,
      );
    } else if (stats.partiallyEffectiveControls > 0) {
      parts.push(
        `Controls rated Partially Effective require targeted improvement actions ` +
        `to achieve full operational effectiveness.`,
      );
    }

    return parts.join(' ');
  }

  private groupControlsByType(
    controls: IcrControlSummary[],
  ): Array<{ type: string; count: number; label: string }> {
    const map = new Map<string, number>();
    for (const c of controls) {
      map.set(c.type, (map.get(c.type) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([type, count]) => ({
        type,
        count,
        label: CONTROL_TYPE_LABELS[type] ?? type,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private buildWeakControlsTable(
    controls: IcrControlSummary[],
    rcm: RcmEntry[],
  ): ControlActivitiesContent['weakControls'] {
    return controls
      .filter((c) =>
        c.effectiveness === 'INEFFECTIVE' || c.effectiveness === 'PARTIALLY_EFFECTIVE',
      )
      .map((c) => {
        const rcmEntry = rcm.find((r) => r.controls.some((rc) => rc.controlId === c.id));
        const linkedRisks = c.linkedRiskNames.slice(0, 3).join(', ') +
          (c.linkedRiskNames.length > 3 ? ` +${c.linkedRiskNames.length - 3} more` : '');

        return {
          controlId: c.id,
          controlName: c.name,
          effectiveness: c.effectiveness,
          linkedRisks: linkedRisks || rcmEntry?.riskName || 'Multiple risks',
          owner: c.owner,
          recommendation: this.buildControlRecommendation(c.effectiveness, c.type),
        };
      });
  }

  private buildControlRecommendation(effectiveness: string, type: string): string {
    const recommendations: Record<string, Record<string, string>> = {
      INEFFECTIVE: {
        PREVENTIVE: 'Control requires immediate redesign. Escalate to risk owner and Risk Committee. Implement compensating controls pending redesign.',
        DETECTIVE: 'Strengthen monitoring frequency and alerting thresholds. Review exception reporting process. Increase detection coverage.',
        CORRECTIVE: 'Evaluate root cause of failure. Implement compensating controls. Escalate to senior management with defined remediation timeline.',
        DIRECTIVE: 'Review policy enforceability and communication. Re-train relevant staff. Escalate non-compliance incidents.',
        COMPENSATING: 'Assess adequacy of compensating measure. Determine whether primary control can be redesigned within 30 days.',
        DEFAULT: 'Control requires urgent remediation. Conduct root cause analysis and implement corrective action plan within 30 days.',
      },
      PARTIALLY_EFFECTIVE: {
        PREVENTIVE: 'Strengthen control parameters and update documented procedures. Conduct targeted staff training on control execution.',
        DETECTIVE: 'Improve detection coverage and reduce lag time. Enhance evidence retention and exception reporting completeness.',
        CORRECTIVE: 'Validate escalation paths and response SLAs. Ensure corrective actions are documented and tracked.',
        DIRECTIVE: 'Reinforce policy compliance monitoring. Update procedures to address identified gaps in execution.',
        COMPENSATING: 'Evaluate whether compensating controls provide sufficient coverage. Document residual risk acceptance if gaps persist.',
        DEFAULT: 'Identify specific gaps in design or operation and implement targeted improvement actions within 60 days.',
      },
    };

    const byEffectiveness = recommendations[effectiveness];
    if (!byEffectiveness) return 'Review and improve control design and operation.';
    return byEffectiveness[type] ?? byEffectiveness['DEFAULT'];
  }

  private identifyCoverageGaps(
    risks: IcrRiskSummary[],
    rcm: RcmEntry[],
  ): string[] {
    return risks
      .filter((r) => {
        const entry = rcm.find((e) => e.riskId === r.id);
        return !entry || entry.controls.length === 0;
      })
      .map(
        (r) =>
          `Risk "${r.name}" (${r.residualRatingLabel} rated) has no mapped controls — ` +
          `immediate control assignment required.`,
      );
  }

  private buildControlManagementActions(
    stats: IcrStats,
    _weakControlCount: number,
  ): string[] {
    const actions: string[] = [];

    if (stats.ineffectiveControls > 0) {
      actions.push(
        `Redesign or replacement of ${stats.ineffectiveControls} ineffective control(s) ` +
        `within 30 days, with escalation to the Risk Management Committee.`,
      );
    }
    if (stats.partiallyEffectiveControls > 0) {
      actions.push(
        `Targeted improvement plans for ${stats.partiallyEffectiveControls} ` +
        `partially effective control(s) within 60 days.`,
      );
    }
    if (stats.notTestedControls > 0) {
      actions.push(
        `Schedule and complete testing for ${stats.notTestedControls} untested control(s) ` +
        `in the next quarterly review cycle.`,
      );
    }
    if (!actions.length) {
      actions.push(
        'Maintain current control testing schedule and continue monitoring effectiveness ratings.',
      );
    }

    return actions;
  }

  buildRcm(data: IcrAggregatedData): SectionOutput {
    return this.section(IcrSectionType.RCM, '6. Risk Control Matrix', 6, {
      summary: (
        `The Risk Control Matrix (RCM) below maps each assessed risk to its mitigating controls. ` +
        `${data.riskControlMatrix.filter((e) => e.controls.length === 0).length} risk(s) currently ` +
        `have no mapped controls and represent the highest priority coverage gaps.`
      ),
      rcmEntries: data.riskControlMatrix,
    });
  }

  buildFindings(report: IcrReportRecord, data: IcrAggregatedData): SectionOutput {
    const { findings, actionPlans, stats } = data;

    const findingsBySeverity = this.groupFindingsBySeverity(findings);
    const findingsTable = findings.map((f) => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      status: f.status,
      riskName: f.riskName ?? '—',
      controlName: f.controlName ?? '—',
      owner: f.owner,
      dueDate: f.dueDate ?? '—',
      daysOpen: f.daysOpen,
      openActions: f.openActionCount,
    }));

    const actionPlanSummary = actionPlans.map((a) => ({
      actionId: a.id,
      description: a.description,
      findingTitle: a.findingTitle,
      owner: a.owner,
      dueDate: a.dueDate,
      status: a.status,
      isOverdue: a.isOverdue,
    }));

    const content: FindingsContent = {
      summary: this.buildFindingsSummary(report, stats),
      criticalCount: stats.criticalFindings,
      openCount: stats.openFindings,
      avgDaysOpen: stats.avgDaysOpen,
      overdueActionCount: stats.overdueActions,
      findingsBySeverity,
      findingsTable,
      actionPlanSummary,
      priorityRecommendations: this.buildFindingsPriorityRecommendations(stats, findings),
    };

    return this.section(IcrSectionType.FINDINGS, '7. Findings, Issues and Gaps', 7, content);
  }

  private buildFindingsSummary(report: IcrReportRecord, stats: IcrStats): string {
    const parts: string[] = [
      `During ${report.reportingPeriod}, ${stats.totalFindings} findings were identified ` +
      `across the assessed risk and control environment.`,
    ];

    if (stats.criticalFindings > 0) {
      parts.push(
        `Of these, ${stats.criticalFindings} finding(s) are rated Critical and require ` +
        `immediate management action and escalation to the Board Risk Committee.`,
      );
    }

    parts.push(
      `${stats.openFindings} findings remain open as at the reporting date, ` +
      `with an average age of ${stats.avgDaysOpen} days.`,
    );

    if (stats.overdueActions > 0) {
      parts.push(
        `${stats.overdueActions} associated action plan(s) are past their agreed due date, ` +
        `indicating remediation delays that require management escalation.`,
      );
    } else if (stats.totalActions > 0) {
      parts.push(
        `All ${stats.totalActions} associated action plans are within their agreed due dates.`,
      );
    }

    parts.push(
      `All findings have been mapped to their associated risks and controls ` +
      `and are presented below in order of severity.`,
    );

    return parts.join(' ');
  }

  private groupFindingsBySeverity(
    findings: IcrFindingSummary[],
  ): FindingsContent['findingsBySeverity'] {
    const total = findings.length || 1;
    return SEVERITY_ORDER
      .map((severity) => ({
        severity,
        count: findings.filter((f) => f.severity === severity).length,
        percentage: pct(findings.filter((f) => f.severity === severity).length, total),
      }))
      .filter((e) => e.count > 0);
  }

  private buildFindingsPriorityRecommendations(
    stats: IcrStats,
    findings: IcrFindingSummary[],
  ): string[] {
    const recs: string[] = [];

    if (stats.criticalFindings > 0) {
      recs.push(
        `Immediate escalation and remediation of ${stats.criticalFindings} critical finding(s) ` +
        `with management sign-off and Board Risk Committee notification within 5 business days.`,
      );
    }
    if (stats.highFindings > 0) {
      recs.push(
        `Remediation of ${stats.highFindings} high-severity finding(s) within 30 days ` +
        `with weekly progress tracking by risk owners.`,
      );
    }
    if (stats.overdueActions > 0) {
      recs.push(
        `Immediate escalation of ${stats.overdueActions} overdue action plan(s) to respective ` +
        `business unit heads with revised due dates and accountable sign-off.`,
      );
    }
    const staleFinding = findings.find((f) => f.status !== 'CLOSED' && f.daysOpen > 90);
    if (staleFinding) {
      const count = findings.filter((f) => f.status !== 'CLOSED' && f.daysOpen > 90).length;
      recs.push(
        `Review and escalate ${count} finding(s) open for more than 90 days ` +
        `to ensure remediation is progressing appropriately.`,
      );
    }
    if (!recs.length) {
      recs.push(
        'Continue tracking findings through the GRC system. ' +
        'Maintain current remediation pace and close findings within agreed timelines.',
      );
    }

    return recs;
  }

  buildActionPlans(data: IcrAggregatedData): SectionOutput {
    const { stats, actionPlans } = data;
    return this.section(IcrSectionType.ACTION_PLANS, '8. Action Plan Status', 8, {
      summary: (
        `${stats.completedActions} of ${stats.totalActions} action plans ` +
        `(${stats.actionCompletionRate}%) have been completed. ` +
        `${stats.overdueActions} action plan(s) are overdue as at the reporting date.`
      ),
      completedCount: stats.completedActions,
      totalCount: stats.totalActions,
      overdueCount: stats.overdueActions,
      completionRate: stats.actionCompletionRate,
      actionPlans: actionPlans.map((a) => ({
        id: a.id,
        description: a.description,
        findingTitle: a.findingTitle,
        owner: a.owner,
        dueDate: a.dueDate,
        status: a.status,
        isOverdue: a.isOverdue,
        completedAt: a.completedAt,
      })),
    });
  }

  buildKriDashboard(data: IcrAggregatedData): SectionOutput {
    const { stats, kris } = data;
    return this.section(IcrSectionType.KRI_DASHBOARD, '9. Key Risk Indicator Dashboard', 9, {
      summary: (
        `${stats.krisInBreach} of ${stats.totalKris} Key Risk Indicators ` +
        `are in breach of approved threshold limits. ` +
        `${stats.krisInWarning} KRI(s) are in a warning state.`
      ),
      breachCount: stats.krisInBreach,
      warningCount: stats.krisInWarning,
      totalKris: stats.totalKris,
      kris: kris.map((k) => ({
        id: k.id,
        name: k.name,
        riskName: k.riskName ?? '—',
        currentValue: k.currentValue,
        threshold: k.threshold,
        warningLevel: k.warningLevel,
        unit: k.unit,
        status: k.status,
        trend: k.trend,
        lastUpdated: k.lastUpdated ?? '—',
      })),
    });
  }

  buildConclusion(report: IcrReportRecord, data: IcrAggregatedData): SectionOutput {
    const { stats } = data;
    const overallRating = this.deriveOverallRating(stats);

    return this.section(IcrSectionType.CONCLUSION, '10. Conclusion and Overall Assessment', 10, {
      overallRating,
      ratingRationale: this.buildRatingRationale(overallRating, stats),
      keyStrengths: this.identifyKeyStrengths(stats),
      priorityActions: this.buildPriorityActions(stats),
      closingStatement: this.buildClosingStatement(report),
    });
  }

  private deriveOverallRating(
    stats: IcrStats,
  ): 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'UNSATISFACTORY' {
    const ineffectivePct = stats.totalControls
      ? stats.ineffectiveControls / stats.totalControls : 0;
    const overdueActionPct = stats.totalActions
      ? stats.overdueActions / stats.totalActions : 0;

    if (
      ineffectivePct >= 0.2 ||
      stats.criticalFindings >= 2 ||
      stats.krisInBreach >= 3 ||
      overdueActionPct >= 0.3
    ) {
      return 'UNSATISFACTORY';
    }

    if (
      ineffectivePct >= 0.1 ||
      stats.criticalFindings >= 1 ||
      stats.krisInBreach >= 1 ||
      overdueActionPct >= 0.15
    ) {
      return 'NEEDS_IMPROVEMENT';
    }

    return 'SATISFACTORY';
  }

  private buildRatingRationale(rating: string, stats: IcrStats): string {
    const rationales: Record<string, string> = {
      SATISFACTORY:
        `The overall internal control environment is assessed as Satisfactory. ` +
        `The majority of controls (${stats.controlEffectivenessRate}%) are operating effectively, ` +
        `findings are being managed within acceptable timelines ` +
        `(average age: ${stats.avgDaysOpen} days), ` +
        `and KRI performance is broadly within risk appetite.`,

      NEEDS_IMPROVEMENT:
        `The overall internal control environment is assessed as Needs Improvement. ` +
        `${stats.criticalFindings} critical finding(s) and ${stats.ineffectiveControls} ` +
        `ineffective control(s) indicate material gaps requiring prompt and structured remediation. ` +
        `${stats.krisInBreach > 0 ? `${stats.krisInBreach} KRI(s) in breach further support this assessment.` : ''}`,

      UNSATISFACTORY:
        `The overall internal control environment is assessed as Unsatisfactory. ` +
        `Significant control deficiencies (${stats.ineffectiveControls} ineffective controls, ` +
        `${stats.criticalFindings} critical findings), elevated KRI breach levels ` +
        `(${stats.krisInBreach} KRIs in breach), and ${stats.overdueActions} overdue action plans ` +
        `present an unacceptable risk profile requiring immediate escalation to ` +
        `the Board Risk Committee.`,
    };

    return rationales[rating] ?? rationales['NEEDS_IMPROVEMENT'];
  }

  private identifyKeyStrengths(stats: IcrStats): string[] {
    const strengths: string[] = [];

    if (stats.controlEffectivenessRate >= 80) {
      strengths.push(
        `Strong overall control effectiveness rate of ${stats.controlEffectivenessRate}% ` +
        `(${stats.effectiveControls} of ${stats.totalControls} controls rated Effective).`,
      );
    }
    if (stats.overdueActions === 0 && stats.totalActions > 0) {
      strengths.push(
        `All ${stats.totalActions} action plans are within their agreed due dates, ` +
        `demonstrating effective remediation governance.`,
      );
    }
    if (stats.krisInBreach === 0) {
      strengths.push(
        `All ${stats.totalKris} Key Risk Indicators are operating within approved threshold limits.`,
      );
    }
    if (stats.criticalFindings === 0) {
      strengths.push('No critical findings were identified during the reporting period.');
    }
    if (stats.actionCompletionRate >= 80) {
      strengths.push(
        `High action plan completion rate of ${stats.actionCompletionRate}% ` +
        `demonstrates effective remediation follow-through.`,
      );
    }

    return strengths.length
      ? strengths
      : ['No significant strengths identified — control improvements are required across multiple dimensions.'];
  }

  private buildPriorityActions(stats: IcrStats): string[] {
    const actions: string[] = [];

    if (stats.criticalFindings > 0) {
      actions.push(
        `Immediate remediation of ${stats.criticalFindings} critical finding(s) ` +
        `with mandatory Board Risk Committee notification within 5 business days.`,
      );
    }
    if (stats.ineffectiveControls > 0) {
      actions.push(
        `Redesign or replacement of ${stats.ineffectiveControls} ineffective control(s) ` +
        `within 30 days, with revised testing evidence submitted to the second line.`,
      );
    }
    if (stats.overdueActions > 0) {
      actions.push(
        `Escalation and accelerated closure of ${stats.overdueActions} overdue action plan(s) ` +
        `with revised due dates approved by business unit heads.`,
      );
    }
    if (stats.krisInBreach > 0) {
      actions.push(
        `Documented management response and remediation plan for ` +
        `${stats.krisInBreach} KRI(s) in breach, submitted to the Risk Management Committee.`,
      );
    }
    if (stats.notTestedControls > 0) {
      actions.push(
        `Schedule and complete effectiveness testing for ${stats.notTestedControls} ` +
        `untested control(s) in the next quarterly review cycle.`,
      );
    }
    if (!actions.length) {
      actions.push(
        'Continue monitoring risk positions and maintain current control standards. ' +
        'No immediate escalation actions required.',
      );
    }

    return actions;
  }

  private buildClosingStatement(report: IcrReportRecord): string {
    return (
      `This Internal Control Report has been prepared in accordance with the ` +
      `${this.resolveFrameworkLabel(report.framework)} and ${BANK_NAME} internal control standards. ` +
      `The findings, assessments, and recommendations contained herein are based on information ` +
      `available within the GRC system as at the reporting date and are subject to management ` +
      `review and formal approval. ` +
      `Subsequent changes to risk profiles, control effectiveness ratings, or finding statuses ` +
      `after the report generation date are not reflected in this document. ` +
      `This report is classified as Internal — Management Confidential and should be ` +
      `distributed only to authorised recipients as defined by the ${BANK_SHORT} Information Classification Policy.`
    );
  }

  private section(
    sectionType: IcrSectionType,
    title: string,
    sortOrder: number,
    content: Record<string, unknown> | IntroductionContent | RiskAssessmentContent | ControlActivitiesContent | FindingsContent,
  ): SectionOutput {
    return { sectionType, title, sortOrder, content: content as Record<string, unknown> };
  }

  private resolveFrameworkLabel(framework: string): string {
    return FRAMEWORK_LABELS[framework] ?? framework;
  }
}

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
