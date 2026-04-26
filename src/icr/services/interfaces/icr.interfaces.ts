/**
 * icr.interfaces.ts
 *
 * Shared data-transfer types used across all three ICR services.
 * These are internal to the service layer — not exposed as API DTOs.
 *
 * Convention:
 *   - Raw*   = data directly from the DB (risks, controls, etc.)
 *   - Icr*   = shaped/computed for the ICR report pipeline
 */

export interface IcrRiskSummary {
  id: number;
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  owner: string;
  inherentLikelihood: number;
  inherentImpact: number;
  inherentRating: number;
  residualLikelihood: number;
  residualImpact: number;
  residualRating: number;
  residualRatingLabel: string;
  riskReduction: number;
  controlCount: number;
  openFindingCount: number;
  openActionCount: number;
  lastAssessedAt: string | null;
  /** Raw dbo.Risks fields included in snapshot for tag preview (optional). */
  event?: unknown;
  created_by?: unknown;
  residual_value?: unknown;
}

export interface IcrControlSummary {
  id: number;
  name: string;
  description: string;
  /** dbo.Controls.code — included for ICR tag preview / export. */
  code: string;
  type: string;
  frequency: string;
  effectiveness: string;
  owner: string;
  linkedRiskIds: number[];
  linkedRiskNames: string[];
  openFindingCount: number;
}

export interface IcrFindingSummary {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  riskId: number | null;
  riskName: string | null;
  controlId: number | null;
  controlName: string | null;
  owner: string;
  dueDate: string | null;
  closedAt: string | null;
  createdAt: string;
  daysOpen: number;
  openActionCount: number;
}

export interface IcrActionPlanSummary {
  id: number;
  description: string;
  findingId: number;
  findingTitle: string;
  owner: string;
  dueDate: string;
  status: string;
  isOverdue: boolean;
  completedAt: string | null;
}

export interface IcrKriSummary {
  id: number;
  name: string;
  riskId: number | null;
  riskName: string | null;
  currentValue: number | null;
  threshold: number;
  warningLevel: number | null;
  unit: string;
  status: 'BREACH' | 'WARNING' | 'WITHIN_LIMIT' | 'NO_DATA';
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'UNKNOWN';
  lastUpdated: string | null;
}

export interface RcmEntry {
  riskId: number;
  riskName: string;
  riskCategory: string;
  riskRating: string;
  inherentRisk: number;
  residualRisk: number;
  controls: Array<{
    controlId: number;
    controlName: string;
    controlType: string;
    effectiveness: string;
    frequency: string;
    owner: string;
  }>;
  openFindings: number;
  openActions: number;
}

export interface IcrStats {
  totalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;

  totalControls: number;
  effectiveControls: number;
  partiallyEffectiveControls: number;
  ineffectiveControls: number;
  notTestedControls: number;
  controlEffectivenessRate: number;

  totalFindings: number;
  openFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  avgDaysOpen: number;

  totalActions: number;
  completedActions: number;
  overdueActions: number;
  actionCompletionRate: number;

  totalKris: number;
  krisInBreach: number;
  krisInWarning: number;
}

export interface IcrAggregatedData {
  risks: IcrRiskSummary[];
  controls: IcrControlSummary[];
  findings: IcrFindingSummary[];
  actionPlans: IcrActionPlanSummary[];
  kris: IcrKriSummary[];
  riskControlMatrix: RcmEntry[];
  stats: IcrStats;
  generatedAt: string;
}

export interface SectionOutput {
  sectionType: string;
  title: string;
  sortOrder: number;
  content: Record<string, unknown>;
}

export interface AggregationScope {
  periodFrom: Date;
  periodTo: Date;
  riskCategoryIds?: number[];
  businessUnitIds?: number[];
  controlOwnerIds?: number[];
  riskRatingMin?: number;
  riskRatingMinLabel?: string;
  includeClosedFindings?: boolean;
}
