export enum IcrSectionType {
  INTRODUCTION = 'INTRODUCTION',
  EXECUTIVE_SUMMARY = 'EXECUTIVE_SUMMARY',
  SCOPE_AND_METHODOLOGY = 'SCOPE_AND_METHODOLOGY',
  COSO_OVERVIEW = 'COSO_OVERVIEW',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  CONTROL_ACTIVITIES = 'CONTROL_ACTIVITIES',
  RCM = 'RCM',
  FINDINGS = 'FINDINGS',
  ACTION_PLANS = 'ACTION_PLANS',
  KRI_DASHBOARD = 'KRI_DASHBOARD',
  CONCLUSION = 'CONCLUSION',
  APPENDIX = 'APPENDIX',
}

export enum IcrSectionStatus {
  PENDING = 'PENDING',
  GENERATED = 'GENERATED',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVIEWED = 'REVIEWED',
  LOCKED = 'LOCKED',
}

export enum IcrContentType {
  STATIC = 'STATIC',
  DYNAMIC = 'DYNAMIC',
  EDITABLE = 'EDITABLE',
}

export interface SectionOwnership {
  makerFunction: string;
  makerInitials: string;
  checkerFunction: string;
  checkerInitials: string;
}

export interface SectionWorkflowEntry {
  action: 'GENERATED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EDITED' | 'LOCKED';
  userId: string;
  userName: string;
  timestamp: string;
  notes?: string;
  fromStatus?: IcrSectionStatus;
  toStatus?: IcrSectionStatus;
}

export interface IcrSectionRecord {
  id: number;
  icrReportId: number;
  sectionType: IcrSectionType;
  title: string;
  sortOrder: number;
  content: Record<string, unknown>;
  contentType: IcrContentType;
  sectionStatus: IcrSectionStatus;
  isVisible: boolean;
  reviewerNotes: string | null;
  rejectionReason: string | null;
  sectionOwner: string | null;
  sectionOwnerInitials: string | null;
  ownership: SectionOwnership | null;
  workflowHistory: SectionWorkflowEntry[];
  version: number;
  lastRegeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdByName: string;
  updatedById: string | null;
  updatedByName: string | null;
}

export const DEFAULT_SECTION_OWNERS: Record<IcrSectionType, { label: string; initials: string }> = {
  [IcrSectionType.INTRODUCTION]:          { label: 'Risk Management',   initials: 'RM' },
  [IcrSectionType.EXECUTIVE_SUMMARY]:     { label: 'Risk Management',   initials: 'RM' },
  [IcrSectionType.SCOPE_AND_METHODOLOGY]: { label: 'Risk Management',   initials: 'RM' },
  [IcrSectionType.COSO_OVERVIEW]:         { label: 'Risk Management',   initials: 'RM' },
  [IcrSectionType.RISK_ASSESSMENT]:       { label: 'Risk Management',   initials: 'RM' },
  [IcrSectionType.CONTROL_ACTIVITIES]:    { label: 'Internal Controls', initials: 'IC' },
  [IcrSectionType.RCM]:                   { label: 'Internal Controls', initials: 'IC' },
  [IcrSectionType.FINDINGS]:              { label: 'Compliance',        initials: 'CO' },
  [IcrSectionType.ACTION_PLANS]:          { label: 'Business Units',    initials: 'BU' },
  [IcrSectionType.KRI_DASHBOARD]:         { label: 'Risk Management',   initials: 'RM' },
  [IcrSectionType.CONCLUSION]:            { label: 'CRO Office',        initials: 'CR' },
  [IcrSectionType.APPENDIX]:              { label: 'Risk Management',   initials: 'RM' },
};

export const SECTION_OWNERSHIP_MAP: Record<IcrSectionType, SectionOwnership> = {
  [IcrSectionType.INTRODUCTION]:          { makerFunction: 'Risk Management',   makerInitials: 'RM', checkerFunction: 'CRO Office',           checkerInitials: 'CR' },
  [IcrSectionType.EXECUTIVE_SUMMARY]:     { makerFunction: 'Risk Management',   makerInitials: 'RM', checkerFunction: 'CRO Office',           checkerInitials: 'CR' },
  [IcrSectionType.SCOPE_AND_METHODOLOGY]: { makerFunction: 'Risk Management',   makerInitials: 'RM', checkerFunction: 'CRO Office',           checkerInitials: 'CR' },
  [IcrSectionType.COSO_OVERVIEW]:         { makerFunction: 'Risk Management',   makerInitials: 'RM', checkerFunction: 'CRO Office',           checkerInitials: 'CR' },
  [IcrSectionType.RISK_ASSESSMENT]:       { makerFunction: 'Risk Management',   makerInitials: 'RM', checkerFunction: 'CRO Office',           checkerInitials: 'CR' },
  [IcrSectionType.CONTROL_ACTIVITIES]:    { makerFunction: 'Internal Controls', makerInitials: 'IC', checkerFunction: 'Risk Management',      checkerInitials: 'RM' },
  [IcrSectionType.RCM]:                   { makerFunction: 'Internal Controls', makerInitials: 'IC', checkerFunction: 'Risk Management',      checkerInitials: 'RM' },
  [IcrSectionType.FINDINGS]:              { makerFunction: 'Compliance',        makerInitials: 'CO', checkerFunction: 'Internal Audit',       checkerInitials: 'IA' },
  [IcrSectionType.ACTION_PLANS]:          { makerFunction: 'Business Units',    makerInitials: 'BU', checkerFunction: 'Risk Management',      checkerInitials: 'RM' },
  [IcrSectionType.KRI_DASHBOARD]:         { makerFunction: 'Risk Management',   makerInitials: 'RM', checkerFunction: 'CRO Office',           checkerInitials: 'CR' },
  [IcrSectionType.CONCLUSION]:            { makerFunction: 'CRO Office',        makerInitials: 'CR', checkerFunction: 'Board Risk Committee', checkerInitials: 'BR' },
  [IcrSectionType.APPENDIX]:              { makerFunction: 'Risk Management',   makerInitials: 'RM', checkerFunction: 'CRO Office',           checkerInitials: 'CR' },
};

export const SECTION_CONTENT_TYPE_MAP: Record<IcrSectionType, IcrContentType> = {
  [IcrSectionType.INTRODUCTION]:          IcrContentType.STATIC,
  [IcrSectionType.EXECUTIVE_SUMMARY]:     IcrContentType.STATIC,
  [IcrSectionType.SCOPE_AND_METHODOLOGY]: IcrContentType.STATIC,
  [IcrSectionType.COSO_OVERVIEW]:         IcrContentType.STATIC,
  [IcrSectionType.RISK_ASSESSMENT]:       IcrContentType.DYNAMIC,
  [IcrSectionType.CONTROL_ACTIVITIES]:    IcrContentType.DYNAMIC,
  [IcrSectionType.RCM]:                   IcrContentType.DYNAMIC,
  [IcrSectionType.FINDINGS]:              IcrContentType.DYNAMIC,
  [IcrSectionType.ACTION_PLANS]:          IcrContentType.DYNAMIC,
  [IcrSectionType.KRI_DASHBOARD]:         IcrContentType.DYNAMIC,
  [IcrSectionType.CONCLUSION]:            IcrContentType.EDITABLE,
  [IcrSectionType.APPENDIX]:              IcrContentType.STATIC,
};
