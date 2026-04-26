import { IcrSectionType } from '../interfaces/icr-section.types';

/**
 * Top-level JSON keys in section `content` that preparers may PATCH via updateSectionContent.
 * Matches narrative fields produced by icr-template-engine (not dynamic tables/stats).
 */
export const ICR_SECTION_EDITABLE_KEYS: Record<IcrSectionType, readonly string[]> = {
  [IcrSectionType.INTRODUCTION]: [
    'purposeStatement',
    'scopeStatement',
    'exclusionsStatement',
    'methodologyPoints',
  ],
  [IcrSectionType.EXECUTIVE_SUMMARY]: [],
  [IcrSectionType.SCOPE_AND_METHODOLOGY]: ['scopeStatement', 'methodologyPoints'],
  [IcrSectionType.COSO_OVERVIEW]: ['bankAlignment'],
  [IcrSectionType.RISK_ASSESSMENT]: ['summary', 'managementFocus'],
  [IcrSectionType.CONTROL_ACTIVITIES]: ['summary', 'coverageGaps'],
  [IcrSectionType.RCM]: ['summary'],
  [IcrSectionType.FINDINGS]: ['summary', 'priorityRecommendations'],
  [IcrSectionType.ACTION_PLANS]: ['summary'],
  [IcrSectionType.KRI_DASHBOARD]: ['summary'],
  [IcrSectionType.CONCLUSION]: [
    'ratingRationale',
    'keyStrengths',
    'priorityActions',
    'closingStatement',
  ],
  [IcrSectionType.APPENDIX]: [],
};

export function getEditableKeysForSection(sectionType: string): readonly string[] {
  const t = sectionType as IcrSectionType;
  return ICR_SECTION_EDITABLE_KEYS[t] ?? [];
}
