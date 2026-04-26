import type { IcrSectionRecord } from './icr-section.types';

export enum IcrStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum IcrFramework {
  COSO = 'COSO',
  ISO31000 = 'ISO31000',
  COBIT = 'COBIT',
}

export enum IcrOverallRating {
  SATISFACTORY = 'SATISFACTORY',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
  UNSATISFACTORY = 'UNSATISFACTORY',
}

export interface IcrScopeFilters {
  riskCategoryIds?: number[];
  businessUnitIds?: number[];
  controlOwnerIds?: number[];
  riskRatingMin?: number;
  includeClosedFindings?: boolean;
}

export interface IcrApprovalChain {
  preparedBy?: string;
  preparedAt?: string | null;
  reviewedBy?: string;
  reviewedAt?: string | null;
  approvedBy?: string;
  approvedAt?: string | null;
  publishedBy?: string;
  publishedAt?: string | null;
}

export interface IcrAuditTrailEntry {
  action: string;
  performedBy: string;
  performedAt: string;
  fromStatus?: IcrStatus;
  toStatus?: IcrStatus;
  notes?: string;
}

export interface IcrReportRecord {
  id: number;
  title: string;
  reportingPeriod: string;
  periodFrom: string;
  periodTo: string;
  framework: IcrFramework;
  /** template = Arabic CBE template flow; generate = English management report */
  reportMode: string | null;
  businessUnit: string | null;
  division: string | null;
  templateId: number | null;
  status: IcrStatus;
  overallRating: IcrOverallRating | null;
  approvalChain: IcrApprovalChain | null;
  scopeFilters: IcrScopeFilters | null;
  reportSnapshot: Record<string, unknown> | null;
  version: number;
  lastRegeneratedAt: string | null;
  lastRegeneratedBy: string | null;
  auditTrail: IcrAuditTrailEntry[];
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdByName: string;
  updatedById: string | null;
  updatedByName: string | null;
  sections?: IcrSectionRecord[];
}
