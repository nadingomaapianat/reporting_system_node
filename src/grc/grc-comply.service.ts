import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UserFunctionAccessService, UserFunctionAccess } from '../shared/user-function-access.service';
import { fq } from '../shared/db-config';

export type GrcComplyReportKey =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'
  | '15'
  | '16'
  | '17'
  | '18'
  | '19'
  | '20'
  | '21'
  | '22'
  | '23'
  | '24'
  | '25'
  | '26';

@Injectable()
export class GrcComplyService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userFunctionAccess: UserFunctionAccessService,
  ) {}

  /**
   * Build date filter clause for SQL queries
   */
  private buildDateFilter(startDate?: string, endDate?: string, dateField: string = 'createdAt'): string {
    if (!startDate && !endDate) return '';
    
    let filter = '';
    
    if (startDate) {
      filter += ` AND ${dateField} >= '${startDate}'`;
    }
    if (endDate) {
      filter += ` AND ${dateField} <= '${endDate} 23:59:59'`;
    }
    
    return filter;
  }

  /**
   * Build function filter for surveys (reports 8, 9) - filters via UserFunction join
   */
  private buildSurveyFunctionFilter(
    access: UserFunctionAccess,
    selectedFunctionId?: string,
    tableAlias: string = 'f'
  ): string {
    // If a specific function is selected, filter by that only
    if (selectedFunctionId) {
      if (!access.isSuperAdmin && !access.functionIds.includes(selectedFunctionId)) {
        return ' AND 1 = 0';
      }
      return ` AND ${tableAlias}.id = '${selectedFunctionId}'`;
    }

    // If no specific function selected, super admins see everything
    if (access.isSuperAdmin) return '';

    if (!access.functionIds.length) {
      return ' AND 1 = 0';
    }

    const ids = access.functionIds.map((id) => `'${id}'`).join(', ');
    return ` AND ${tableAlias}.id IN (${ids})`;
  }

  /**
   * Build function filter for compliance reports - filters via Domains (function codes)
   */
  private buildComplianceFunctionFilter(
    access: UserFunctionAccess,
    selectedFunctionId?: string
  ): string {
    // If a specific function is selected, filter by that only
    if (selectedFunctionId) {
      if (!access.isSuperAdmin && !access.functionIds.includes(selectedFunctionId)) {
        return ' AND 1 = 0';
      }
      return ` AND D.code = '${selectedFunctionId}'`;
    }

    // If no specific function selected, super admins see everything
    if (access.isSuperAdmin) return '';

    if (!access.functionIds.length) {
      return ' AND 1 = 0';
    }

    const ids = access.functionIds.map((id) => `'${id}'`).join(', ');
    return ` AND D.code IN (${ids})`;
  }

  /**
   * Build function filter for survey-based reports - filters via Users -> UserFunction
   * Returns a WHERE clause to filter users by their function access
   */
  private buildSurveyUserFunctionFilter(
    access: UserFunctionAccess,
    selectedFunctionId?: string,
    userIdColumn: string = 'userId'
  ): string {
    if (selectedFunctionId) {
      if (!access.isSuperAdmin && !access.functionIds.includes(selectedFunctionId)) {
        return ' AND 1 = 0';
      }
      return ` AND EXISTS (SELECT 1 FROM UserFunction uf WHERE uf.userId = ${userIdColumn} AND uf.functionId = '${selectedFunctionId}' AND uf.deletedAt IS NULL)`;
    }

    if (access.isSuperAdmin) return '';

    if (!access.functionIds.length) {
      return ' AND 1 = 0';
    }

    const ids = access.functionIds.map((id) => `'${id}'`).join(', ');
    return ` AND EXISTS (SELECT 1 FROM UserFunction uf WHERE uf.userId = ${userIdColumn} AND uf.functionId IN (${ids}) AND uf.deletedAt IS NULL)`;
  }

  /**
   * Build function filter for control-based reports - uses UserFunctionAccessService
   */
  private buildControlFunctionFilterForComply(
    tableAlias: string,
    access: UserFunctionAccess,
    selectedFunctionId?: string
  ): string {
    return this.userFunctionAccess.buildControlFunctionFilter(tableAlias, access, selectedFunctionId);
  }

  /**
   * Build function filter for risk-based reports - uses UserFunctionAccessService
   */
  private buildRiskFunctionFilterForComply(
    tableAlias: string,
    access: UserFunctionAccess,
    selectedFunctionId?: string
  ): string {
    return this.userFunctionAccess.buildRiskFunctionFilter(tableAlias, access, selectedFunctionId);
  }

  async runReport(report: GrcComplyReportKey, startDate?: string, endDate?: string, functionId?: string, access?: UserFunctionAccess) {
    // Debug logging for report 26 to verify filters are being passed
    if (report === '26') {
      console.log('[GrcComplyService.runReport] Report 26 - Impacted Areas Trend Over Time');
      console.log('[GrcComplyService.runReport] Filters:', { startDate, endDate, functionId });
    }
    
    // If access not provided, create a default (super admin) access
    const userAccess = access || { isSuperAdmin: true, functionIds: [] };
    
    const sqlQuery = this.getSqlForReport(report, startDate, endDate, functionId, userAccess);

    if (!sqlQuery) {
      throw new BadRequestException(`Unknown report id: ${report}`);
    }

    // Log the SQL query for report 26 to verify filters are applied
    if (report === '26') {
      console.log('[GrcComplyService.runReport] Report 26 SQL Query:', sqlQuery);
    }

    return this.databaseService.query(sqlQuery);
  }

  async runAllReports(startDate?: string, endDate?: string, functionId?: string, access?: UserFunctionAccess) {
    // Log filters for debugging - always log to see what's being received
    console.log('[GrcComplyService.runAllReports] Called with filters:', { 
      startDate, 
      endDate, 
      functionId,
      hasStartDate: !!startDate,
      hasEndDate: !!endDate,
      hasAccess: !!access,
      isSuperAdmin: access?.isSuperAdmin
    });
    
    // If access not provided, create a default (super admin) access
    const userAccess = access || { isSuperAdmin: true, functionIds: [] };
    
    const reportKeys: GrcComplyReportKey[] = [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
    ];

    const reportNames: Record<GrcComplyReportKey, string> = {
      '1': 'Survey Completion Rate',
      '2': 'Bank Questions details',
      '3': 'Risks per category details',
      '4': 'Controls per category details',
      '5': 'Controls per domains Details',
      '6': 'Compliance Details',
      '7': 'Impacted Areas by Number of Linked Controls',
      '8': 'Survey Participation by Department',
      '9': 'Most Active vs Least Active Functions (Answer Count)',
      '10': 'Survey Coverage by Category (How many categories included per survey)',
      '11': 'Questions Per Category',
      '12': 'Compliance managment details',
      '13': 'Compliance controls without evidence',
      '14': 'Surveys by Status',
      '15': 'Average Score Per Survey',
      '16': 'Compliance by Control Category',
      '17': 'Top Failed Controls',
      '18': 'Questions no. per type',
      '19': 'Questions no. per References',
      '20': 'Risks no. per category',
      '21': 'Controls no. per category',
      '22': 'Control Nos. per Domains',
      '23': 'Compliance per complianceStatus',
      '24': 'Compliance per progressStatus',
      '25': 'Compliance per approval_status',
      '26': 'Impacted Areas Trend Over Time',
    };

    // Run all reports with filters applied
    const results = await Promise.all(
      reportKeys.map((key) => this.runReport(key, startDate, endDate, functionId, userAccess)),
    );

    const combined: Record<string, any> = {};

    reportKeys.forEach((key, index) => {
      const name = reportNames[key] || key;
      combined[name] = results[index];
    });

    return combined;
  }

  private getSqlForReport(report: GrcComplyReportKey, startDate?: string, endDate?: string, functionId?: string, access?: UserFunctionAccess): string {
    // If access not provided, create a default (super admin) access
    const userAccess = access || { isSuperAdmin: true, functionIds: [] };
    
    switch (report) {
      case '1':
        const surveyCompletionDateFilter = this.buildDateFilter(startDate, endDate, 'ps.createdAt');
        const surveyCompletionFunctionFilter = this.buildSurveyUserFunctionFilter(userAccess, functionId, 'psu.userId');
        const surveyCompletionFunctionFilter2 = this.buildSurveyUserFunctionFilter(userAccess, functionId, 'sa.userId');
        return `
SELECT
  ps.name_en,
  COUNT(DISTINCT psu.userId) AS assigned,
  COUNT(DISTINCT sa.userId) AS completed,
  COUNT(DISTINCT sa.userId) * 100.0 / NULLIF(COUNT(DISTINCT psu.userId), 0) AS completion_rate
FROM PublicSurveys ps
LEFT JOIN PublicSurveyUsers psu ON ps.id = psu.publicSurveyId ${surveyCompletionFunctionFilter}
LEFT JOIN survey_assessment sa ON sa.surveyId = ps.id ${surveyCompletionFunctionFilter2}
WHERE ps.deletedAt IS NULL ${surveyCompletionDateFilter}
GROUP BY ps.id, ps.name_en
`;

      case '2':
        const bankQuestionsDateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
        return `
SELECT DISTINCT
  BankQuestions.[code],
  [question_en] AS question,
  ControlReferences.name AS Reference,
  [Categories].name AS Category,
  [question_type],
  [choices]
FROM BankQuestions,
     ControlReferences,
     [Categories]
WHERE BankQuestions.reference_id = ControlReferences.id
  AND BankQuestions.categoryId = [Categories].id
  AND BankQuestions.[deletedAt] IS NULL ${bankQuestionsDateFilter}
ORDER BY BankQuestions.[code]
`;

      case '3':
        const risksCategoryDateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
        const risksCategoryFunctionFilter = this.buildRiskFunctionFilterForComply('risks', userAccess, functionId);
        return `
SELECT DISTINCT
  Categories.name AS category,
  risks.name AS risk
FROM BankQuestionRisks,
     risks,
     BankQuestions,
     Categories
WHERE BankQuestionRisks.risk_id = risks.id
  AND BankQuestions.categoryId = Categories.id
  AND BankQuestions.id = BankQuestionRisks.bank_question_id
  AND BankQuestions.[deletedAt] IS NULL ${risksCategoryDateFilter} ${risksCategoryFunctionFilter}
`;

      case '4':
        const controlsCategoryDateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
        const controlsCategoryFunctionFilter = this.buildControlFunctionFilterForComply('Controls', userAccess, functionId);
        return `
SELECT DISTINCT
  Categories.name AS category,
  Controls.name AS control
FROM BankQuestionControls,
     Controls,
     BankQuestions,
     Categories
WHERE BankQuestionControls.control_id = Controls.id
  AND BankQuestions.categoryId = Categories.id
  AND BankQuestions.id = BankQuestionControls.bank_question_id
  AND BankQuestions.[deletedAt] IS NULL ${controlsCategoryDateFilter} ${controlsCategoryFunctionFilter}
ORDER BY Categories.name,
         Controls.name
`;

      case '5':
        const controlDomainsDateFilter = this.buildDateFilter(startDate, endDate, 'controls.[createdAt]');
        const controlDomainsFunctionFilter = this.buildControlFunctionFilterForComply('controls', userAccess, functionId);
        return `
SELECT
  Domains.en_name AS Domain,
  controls.name AS Control
FROM [controlDomains],
     Domains,
     controls
WHERE controlDomains.domain_id = Domains.id
  AND controlDomains.control_id = controls.id
  AND controls.[deletedAt] IS NULL ${controlDomainsDateFilter} ${controlDomainsFunctionFilter}
ORDER BY Domains.en_name,
         controls.name
`;

      case '6':
        const complianceDateFilter = this.buildDateFilter(startDate, endDate, 'C.[createdAt]');
        const complianceFunctionFilter = this.buildComplianceFunctionFilter(userAccess, functionId);
        return `
SELECT DISTINCT
  C.[code],
  C.[complianceItem_en] AS compliance,
  C.[complianceStatus],
  C.[progress],
  C.[progressStatus],
  C.[quarter],
  C.[year],
  C.[approval_status],
  C.[createdAt]
FROM [NEWDCC-V4-UAT].[dbo].[Compliances] C
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[complianceReferences] CR ON C.id = CR.compliance_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[controlDomains] CD ON CR.reference_id = CD.domain_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[Domains] D ON CD.domain_id = D.id
WHERE C.[deletedAt] IS NULL ${complianceDateFilter} ${complianceFunctionFilter}
ORDER BY C.[code]
`;

      case '7':
        const impactedAreaDateFilter = this.buildDateFilter(startDate, endDate, 'sia.createdAt');
        // Build function filter - filter through controls linked to impacted areas
        // Since the report is about "control_links", we filter by checking if controls with the function exist
        // We'll use a subquery to check if there are controls with the selected function
        // that are related to the impacted areas (the exact relationship depends on schema)
        let impactedAreaFunctionFilter = '';
        if (functionId) {
          if (!userAccess.isSuperAdmin && !userAccess.functionIds.includes(functionId)) {
            impactedAreaFunctionFilter = ' AND 1 = 0';
          } else {
            // Filter by checking if there are controls with the selected function
            // This assumes controls are somehow related to impacted areas
            // The exact join depends on your schema - adjust as needed
            impactedAreaFunctionFilter = ` AND EXISTS (
              SELECT 1 
              FROM Controls c
              JOIN ControlFunctions cf ON cf.control_id = c.id 
                AND cf.function_id = '${functionId}' 
                AND cf.deletedAt IS NULL
              WHERE c.deletedAt IS NULL
                AND EXISTS (
                  SELECT 1 FROM ImpactedAreas ia_check
                  WHERE ia_check.id = ia.id
                )
            )`;
          }
        } else if (!userAccess.isSuperAdmin) {
          if (!userAccess.functionIds.length) {
            impactedAreaFunctionFilter = ' AND 1 = 0';
          } else {
            const ids = userAccess.functionIds.map((id) => `'${id}'`).join(', ');
            impactedAreaFunctionFilter = ` AND EXISTS (
              SELECT 1 
              FROM Controls c
              JOIN ControlFunctions cf ON cf.control_id = c.id 
                AND cf.function_id IN (${ids}) 
                AND cf.deletedAt IS NULL
              WHERE c.deletedAt IS NULL
                AND EXISTS (
                  SELECT 1 FROM ImpactedAreas ia_check
                  WHERE ia_check.id = ia.id
                )
            )`;
          }
        }
        return `
SELECT
  ia.name AS impacted_area,
  COUNT(sia.id) AS control_links
FROM survey_impacted_area sia
JOIN ImpactedAreas ia ON ia.id = sia.impactedAreaId
WHERE sia.deletedAt IS NULL ${impactedAreaDateFilter} ${impactedAreaFunctionFilter}
GROUP BY ia.name
ORDER BY control_links DESC
`;

      case '8':
        const surveyParticipationDateFilter = this.buildDateFilter(startDate, endDate, 'psu.createdAt');
        const surveyParticipationFunctionFilter = this.buildSurveyFunctionFilter(userAccess, functionId, 'f');
        return `
SELECT
  f.name AS function_name,
  COUNT(DISTINCT psu.userId) AS participants
FROM PublicSurveyUsers psu
JOIN Users u ON u.id = psu.userId
JOIN UserFunction uf ON uf.userId = u.id AND uf.deletedAt IS NULL
JOIN Functions f ON f.id = uf.functionId AND f.deletedAt IS NULL
WHERE 1=1 ${surveyParticipationDateFilter} ${surveyParticipationFunctionFilter}
GROUP BY f.name
ORDER BY participants DESC
`;

      case '9':
        const activeFunctionDateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
        const activeFunctionFilter = this.buildSurveyFunctionFilter(userAccess, functionId, 'f');
        return `
SELECT
  f.name AS function_name,
  COUNT(sa.id) AS total_answers
FROM survey_assessment sa
JOIN Users u ON sa.userId = u.id
JOIN UserFunction uf ON uf.userId = u.id AND uf.deletedAt IS NULL
JOIN Functions f ON f.id = uf.functionId AND f.deletedAt IS NULL
WHERE 1=1 ${activeFunctionDateFilter} ${activeFunctionFilter}
GROUP BY f.name
ORDER BY total_answers DESC
`;

      case '10':
        const surveyCategoryDateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
        const surveyCategoryFunctionFilter = this.buildSurveyUserFunctionFilter(userAccess, functionId, 'sa.userId');
        return `
SELECT
  ps.name_en AS survey_name,
  c.name AS category_name,
  COUNT(*) AS question_count
FROM survey_assessment sa
JOIN PublicSurveys ps ON ps.id = sa.surveyId
JOIN BankQuestions bq ON sa.questionId = bq.id
JOIN Categories c ON c.id = bq.categoryId
WHERE 1=1 ${surveyCategoryDateFilter} ${surveyCategoryFunctionFilter}
GROUP BY ps.name_en, c.name
ORDER BY ps.name_en, c.name
`;

      case '11':
        const questionsCategoryDateFilter = this.buildDateFilter(startDate, endDate, 'bq.[createdAt]');
        return `
SELECT
  c.name AS category_name,
  COUNT(*) AS total_questions
FROM BankQuestions bq
JOIN Categories c ON bq.categoryId = c.id
WHERE bq.[deletedAt] IS NULL ${questionsCategoryDateFilter}
GROUP BY c.name
ORDER BY total_questions DESC
`;

      case '12':
        const complianceDetailDateFilter = this.buildDateFilter(startDate, endDate, 'C.[createdAt]');
        const complianceDetailFunctionFilter = this.buildComplianceFunctionFilter(userAccess, functionId);
        return `
SELECT DISTINCT
  C.[code] AS ComplianceCode,
  [complianceItem_en],
  [complianceStatus],
  [progress],
  [progressStatus],
  [quarter],
  [year],
  [approval_status],
  cre.code AS StandardCode,
  CRE.NAME AS StandardName,
  (SELECT CODE FROM [NEWDCC-V4-UAT].[dbo].[Domains] WHERE id = D.id) AS FunctionID,
  (SELECT [en_name]
   FROM [NEWDCC-V4-UAT].[dbo].[Domains]
   WHERE ID IN (SELECT parentId FROM [NEWDCC-V4-UAT].[dbo].[Domains] WHERE id = D.id)
  ) AS Functionn,
  D.[en_name] AS Domain,
  Controls.CODE AS ControlCode,
  Controls.name AS ControlName
FROM [NEWDCC-V4-UAT].[dbo].[Compliances] C,
     [NEWDCC-V4-UAT].[dbo].[complianceReferences] CR,
     ControlReferences CRE,
     [NEWDCC-V4-UAT].[dbo].[Domains] D,
     [NEWDCC-V4-UAT].[dbo].[controlDomains] CD,
     [NEWDCC-V4-UAT].[dbo].[Controls] Controls
WHERE C.id = CR.compliance_id
  AND CR.reference_id = CRE.id
  AND CR.reference_id = D.standard_id
  AND CD.domain_id = D.id
  AND CD.control_id = Controls.id
  AND C.[deletedAt] IS NULL ${complianceDetailDateFilter} ${complianceDetailFunctionFilter}
ORDER BY C.code,
         cre.code,
         FunctionID,
         Domain,
         Controls.CODE
`;

      case '13':
        const complianceEvidenceDateFilter = this.buildDateFilter(startDate, endDate, 'CCA.[createdAt]');
        // Build function filter for compliance evidence - filter via Domains
        let complianceEvidenceFunctionFilter = '';
        if (functionId) {
          if (!userAccess.isSuperAdmin && !userAccess.functionIds.includes(functionId)) {
            complianceEvidenceFunctionFilter = ' AND 1 = 0';
          } else {
            complianceEvidenceFunctionFilter = ` AND D.[code] = '${functionId}'`;
          }
        } else if (!userAccess.isSuperAdmin) {
          if (!userAccess.functionIds.length) {
            complianceEvidenceFunctionFilter = ' AND 1 = 0';
          } else {
            const ids = userAccess.functionIds.map((id) => `'${id}'`).join(', ');
            complianceEvidenceFunctionFilter = ` AND D.[code] IN (${ids})`;
          }
        }
        return `
SELECT DISTINCT
  C.[code] AS ComplianceCode,
  C.[complianceItem_en] AS ComplianceName,
  D.[code] AS DomainCode,
  D.[en_name] AS DomainName,
  Ctrl.[code] AS ControlCode,
  Ctrl.[name] AS ControlName,
  CCA.[evidence]
FROM (
  SELECT 
    compliance_id,
    domain_id,
    control_id,
    [evidence],
    MIN([createdAt]) AS [createdAt]
  FROM [NEWDCC-V4-UAT].[dbo].[ComplianceControlActions]
  WHERE [evidence] IS NULL
    AND [deletedAt] IS NULL ${complianceEvidenceDateFilter}
  GROUP BY compliance_id, domain_id, control_id, [evidence]
) AS CCA
JOIN [NEWDCC-V4-UAT].[dbo].[Compliances] C ON C.id = CCA.compliance_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[Domains] D ON D.id = CCA.domain_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[Controls] Ctrl ON Ctrl.id = CCA.control_id
WHERE C.[deletedAt] IS NULL ${complianceEvidenceFunctionFilter}
ORDER BY ComplianceCode,
         DomainCode,
         ControlCode
`;

      case '14':
        const approvalStatusDateFilter = this.buildDateFilter(startDate, endDate, 'ps.createdAt');
        // For surveys by status, we can't directly filter by function, but we can filter by users who participated
        // This is a simplified approach - if function filter is needed, it would require joining with survey users
        return `
SELECT 
  ps.approval_status,
  COUNT(*) AS total
FROM PublicSurveys ps
WHERE ps.deletedAt IS NULL ${approvalStatusDateFilter}
GROUP BY ps.approval_status;
`;

      case '15':
        const maturityScoreDateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
        const maturityScoreFunctionFilter = this.buildSurveyUserFunctionFilter(userAccess, functionId, 'sa.userId');
        return `
SELECT 
  ps.name_en AS survey_name,
  AVG(
    CASE 
      WHEN sa.answer LIKE '%Fully Implemented%' THEN 5
      WHEN sa.answer LIKE '%Mostly Implemented%' THEN 4
      WHEN sa.answer LIKE '%Most%' THEN 4
      WHEN sa.answer LIKE '%Averagely Implemented%' THEN 3
      WHEN sa.answer LIKE '%Moderate%' THEN 3
      WHEN sa.answer LIKE '%Significant%' THEN 3
      WHEN sa.answer LIKE '%Partially Implemented%' THEN 2
      WHEN sa.answer LIKE '%Minimal%' THEN 1
      WHEN sa.answer LIKE '%Least%' THEN 1
      WHEN sa.answer LIKE '%Not Implemented%' THEN 1
      ELSE NULL
    END
  ) AS avg_maturity_score
FROM survey_assessment sa
JOIN PublicSurveys ps 
  ON sa.surveyId = ps.id
WHERE 
  CASE 
    WHEN sa.answer LIKE '%Fully Implemented%' THEN 5
    WHEN sa.answer LIKE '%Mostly Implemented%' THEN 4
    WHEN sa.answer LIKE '%Most%' THEN 4
    WHEN sa.answer LIKE '%Averagely Implemented%' THEN 3
    WHEN sa.answer LIKE '%Moderate%' THEN 3
    WHEN sa.answer LIKE '%Significant%' THEN 3
    WHEN sa.answer LIKE '%Partially Implemented%' THEN 2
    WHEN sa.answer LIKE '%Minimal%' THEN 1
    WHEN sa.answer LIKE '%Least%' THEN 1
    WHEN sa.answer LIKE '%Not Implemented%' THEN 1
    ELSE NULL
  END IS NOT NULL ${maturityScoreDateFilter} ${maturityScoreFunctionFilter}
GROUP BY 
  ps.name_en;
`;

      case '16':
        const categoryMaturityDateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
        // Build function filter - filter by controls' functions, not users' functions
        // Categories are linked to BankQuestions, which are linked to Controls via BankQuestionControls
        // So we filter by the controls' functions
        let categoryMaturityFunctionFilter = '';
        if (functionId) {
          if (!userAccess.isSuperAdmin && !userAccess.functionIds.includes(functionId)) {
            categoryMaturityFunctionFilter = ' AND 1 = 0';
          } else {
            // Filter by checking if the question's category has controls with the selected function
            categoryMaturityFunctionFilter = ` AND EXISTS (
              SELECT 1 
              FROM BankQuestionControls bqc
              JOIN Controls ctrl ON bqc.control_id = ctrl.id
              JOIN ControlFunctions cf ON cf.control_id = ctrl.id 
                AND cf.function_id = '${functionId}' 
                AND cf.deletedAt IS NULL
              WHERE bqc.bank_question_id = bq.id
                AND bqc.deletedAt IS NULL
                AND ctrl.deletedAt IS NULL
            )`;
          }
        } else if (!userAccess.isSuperAdmin) {
          if (!userAccess.functionIds.length) {
            categoryMaturityFunctionFilter = ' AND 1 = 0';
          } else {
            const ids = userAccess.functionIds.map((id) => `'${id}'`).join(', ');
            categoryMaturityFunctionFilter = ` AND EXISTS (
              SELECT 1 
              FROM BankQuestionControls bqc
              JOIN Controls ctrl ON bqc.control_id = ctrl.id
              JOIN ControlFunctions cf ON cf.control_id = ctrl.id 
                AND cf.function_id IN (${ids}) 
                AND cf.deletedAt IS NULL
              WHERE bqc.bank_question_id = bq.id
                AND bqc.deletedAt IS NULL
                AND ctrl.deletedAt IS NULL
            )`;
          }
        }
        return `
SELECT 
  c.name AS category_name,
  AVG(maturity_score) AS avg_maturity_score
FROM (
  SELECT
    sa.id,
    sa.answer,
    sa.userId,
    bq.categoryId,
    bq.id AS questionId,
    CASE 
      WHEN sa.answer LIKE '%Fully Implemented%' THEN 5
      WHEN sa.answer LIKE '%Mostly Implemented%' THEN 4
      WHEN sa.answer LIKE '%Most%' THEN 4
      WHEN sa.answer LIKE '%Averagely Implemented%' THEN 3
      WHEN sa.answer LIKE '%Moderate%' THEN 3
      WHEN sa.answer LIKE '%Partially Implemented%' THEN 2
      WHEN sa.answer LIKE '%Minimal%' THEN 1
      WHEN sa.answer LIKE '%Least%' THEN 1
      WHEN sa.answer LIKE '%Not Implemented%' THEN 1
      WHEN sa.answer LIKE '%Significant%' THEN 3
      ELSE NULL
    END AS maturity_score
  FROM survey_assessment sa
  JOIN BankQuestions bq ON sa.questionId = bq.id
  WHERE 1=1 ${categoryMaturityDateFilter} ${categoryMaturityFunctionFilter}
) AS x
JOIN Categories c ON x.categoryId = c.id
WHERE maturity_score IS NOT NULL
GROUP BY c.name
ORDER BY avg_maturity_score DESC;
`;

      case '17':
        const failedControlsDateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
        const failedControlsUserFunctionFilter = this.buildSurveyUserFunctionFilter(userAccess, functionId, 'sa.userId');
        const failedControlsControlFunctionFilter = this.buildControlFunctionFilterForComply('ctrl', userAccess, functionId);
        return `
SELECT TOP 10
  ctrl.name AS control_name,
  COUNT(*) AS failed_count
FROM (
  SELECT
    sa.id,
    sa.answer,
    sa.userId,
    bqc.control_id,
    CASE 
      WHEN sa.answer LIKE '%Fully Implemented%' THEN 5
      WHEN sa.answer LIKE '%Mostly Implemented%' THEN 4
      WHEN sa.answer LIKE '%Most%' THEN 4
      WHEN sa.answer LIKE '%Averagely Implemented%' THEN 3
      WHEN sa.answer LIKE '%Moderate%' THEN 3
      WHEN sa.answer LIKE '%Partially Implemented%' THEN 2
      WHEN sa.answer LIKE '%Minimal%' THEN 1
      WHEN sa.answer LIKE '%Least%' THEN 1
      WHEN sa.answer LIKE '%Not Implemented%' THEN 1
      ELSE NULL
    END AS score
  FROM survey_assessment sa
  JOIN BankQuestions bq ON sa.questionId = bq.id
  JOIN BankQuestionControls bqc ON bqc.bank_question_id = bq.id
  WHERE 1=1 ${failedControlsDateFilter} ${failedControlsUserFunctionFilter}
) AS x
JOIN Controls ctrl ON ctrl.id = x.control_id
WHERE score IN (1, 2) ${failedControlsControlFunctionFilter}
GROUP BY ctrl.name
ORDER BY failed_count DESC;
`;

      case '18':
        const questionTypeDateFilter = this.buildDateFilter(startDate, endDate, '[createdAt]');
        return `
SELECT
  question_type,
  COUNT(code) AS count
FROM [NEWDCC-V4-UAT].[dbo].BankQuestions
WHERE [deletedAt] IS NULL ${questionTypeDateFilter}
GROUP BY question_type;
`;

      case '19':
        const questionReferenceDateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
        return `
SELECT
  ControlReferences.name AS Referencename,
  COUNT(BankQuestions.code) AS count
FROM BankQuestions,
     ControlReferences
WHERE BankQuestions.reference_id = ControlReferences.id
  AND BankQuestions.[deletedAt] IS NULL ${questionReferenceDateFilter}
GROUP BY ControlReferences.name;
`;

      case '20':
        const risksPerCategoryDateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
        const risksPerCategoryFunctionFilter = this.buildRiskFunctionFilterForComply('risks', userAccess, functionId);
        return `
SELECT
  Categories.name AS category,
  COUNT(DISTINCT risks.name) AS risk
FROM BankQuestionRisks,
     risks,
     BankQuestions,
     Categories
WHERE BankQuestionRisks.risk_id = risks.id
  AND BankQuestions.categoryId = Categories.id
  AND BankQuestions.id = BankQuestionRisks.bank_question_id
  AND BankQuestions.[deletedAt] IS NULL ${risksPerCategoryDateFilter} ${risksPerCategoryFunctionFilter}
GROUP BY Categories.name;
`;

      case '21':
        const controlsPerCategoryDateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
        const controlsPerCategoryFunctionFilter = this.buildControlFunctionFilterForComply('Controls', userAccess, functionId);
        return `
SELECT
  Categories.name AS category,
  COUNT(DISTINCT Controls.name) AS controlNos
FROM BankQuestionControls,
     Controls,
     BankQuestions,
     Categories
WHERE BankQuestionControls.control_id = Controls.id
  AND BankQuestions.categoryId = Categories.id
  AND BankQuestions.id = BankQuestionControls.bank_question_id
  AND BankQuestions.[deletedAt] IS NULL ${controlsPerCategoryDateFilter} ${controlsPerCategoryFunctionFilter}
GROUP BY Categories.name;
`;

      case '22':
        const controlDomainsCountDateFilter = this.buildDateFilter(startDate, endDate, 'controls.[createdAt]');
        const controlDomainsCountFunctionFilter = this.buildControlFunctionFilterForComply('controls', userAccess, functionId);
        return `
SELECT
  Domains.en_name AS Domain,
  COUNT([controlDomains].control_id) AS ControlNos
FROM [controlDomains],
     Domains,
     controls
WHERE controlDomains.domain_id = Domains.id
  AND controlDomains.control_id = controls.id
  AND controls.[deletedAt] IS NULL ${controlDomainsCountDateFilter} ${controlDomainsCountFunctionFilter}
GROUP BY Domains.en_name;
`;

      case '23':
        const complianceStatusDateFilter = this.buildDateFilter(startDate, endDate, 'C.[createdAt]');
        const complianceStatusFunctionFilter = this.buildComplianceFunctionFilter(userAccess, functionId);
        return `
SELECT
  COUNT(C.[id]) AS Compliance,
  C.[complianceStatus]
FROM [NEWDCC-V4-UAT].[dbo].[Compliances] C
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[complianceReferences] CR ON C.id = CR.compliance_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[controlDomains] CD ON CR.reference_id = CD.domain_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[Domains] D ON CD.domain_id = D.id
WHERE C.[deletedAt] IS NULL ${complianceStatusDateFilter} ${complianceStatusFunctionFilter}
GROUP BY C.[complianceStatus];
`;

      case '24':
        const progressStatusDateFilter = this.buildDateFilter(startDate, endDate, 'C.[createdAt]');
        const progressStatusFunctionFilter = this.buildComplianceFunctionFilter(userAccess, functionId);
        return `
SELECT
  COUNT(C.[id]) AS Compliance,
  C.[progressStatus]
FROM [NEWDCC-V4-UAT].[dbo].[Compliances] C
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[complianceReferences] CR ON C.id = CR.compliance_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[controlDomains] CD ON CR.reference_id = CD.domain_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[Domains] D ON CD.domain_id = D.id
WHERE C.[deletedAt] IS NULL ${progressStatusDateFilter} ${progressStatusFunctionFilter}
GROUP BY C.[progressStatus];
`;

      case '25':
        const complianceApprovalStatusDateFilter = this.buildDateFilter(startDate, endDate, 'C.[createdAt]');
        const complianceApprovalStatusFunctionFilter = this.buildComplianceFunctionFilter(userAccess, functionId);
        return `
SELECT
  COUNT(C.[id]) AS Compliance,
  C.[approval_status]
FROM [NEWDCC-V4-UAT].[dbo].[Compliances] C
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[complianceReferences] CR ON C.id = CR.compliance_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[controlDomains] CD ON CR.reference_id = CD.domain_id
LEFT JOIN [NEWDCC-V4-UAT].[dbo].[Domains] D ON CD.domain_id = D.id
WHERE C.[deletedAt] IS NULL ${complianceApprovalStatusDateFilter} ${complianceApprovalStatusFunctionFilter}
GROUP BY C.[approval_status];
`;

      case '26':
        // Build WHERE clause with proper date filtering
        // Use CAST to ensure proper date comparison in SQL Server
        let whereClause = 'WHERE sia.deletedAt IS NULL';
        if (startDate || endDate) {
          if (startDate) {
            // Cast to DATE for proper comparison, then compare with datetime
            whereClause += ` AND CAST(sia.createdAt AS DATE) >= CAST('${startDate}' AS DATE)`;
          }
          if (endDate) {
            // Cast to DATE for proper comparison, then compare with datetime
            whereClause += ` AND CAST(sia.createdAt AS DATE) <= CAST('${endDate}' AS DATE)`;
          }
        }
        
        // Note: survey_impacted_area has no direct relationship to functions
        // Function filtering is not applicable for this report
        // Only date filters are applied
        
        // Log the query for debugging
        const sqlQuery = `
SELECT 
  FORMAT(sia.createdAt, 'yyyy-MM') AS month,
  COUNT(*) AS impacted_area_count
FROM survey_impacted_area sia
${whereClause}
GROUP BY FORMAT(sia.createdAt, 'yyyy-MM')
ORDER BY month;
`;
        
        if (startDate || endDate) {
          console.log('[GrcComplyService] Report 26 - Date filters applied:', { startDate, endDate });
          console.log('[GrcComplyService] Report 26 - SQL Query:', sqlQuery);
        }
        
        return sqlQuery;

      default:
        return '';
    }
  }

  /**
   * Get comply dashboard data with filters
   */
  async getComplyDashboard(user: any, startDate?: string, endDate?: string, functionId?: string) {
    // Get all reports and return them as dashboard data
    // The frontend will transform this data into cards, charts, and tables
    console.log('[GrcComplyService.getComplyDashboard] Received filters:', { startDate, endDate, functionId, userId: user?.id, groupName: user?.groupName });
    
    // Get user function access (super_admin_ sees everything)
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );
    console.log('[GrcComplyService.getComplyDashboard] User access:', { isSuperAdmin: access.isSuperAdmin, functionIds: access.functionIds, selectedFunctionId: functionId });
    
    // Pass filters and access to runAllReports so they are applied to all SQL queries
    return this.runAllReports(startDate, endDate, functionId, access);
  }

  /**
   * Get surveys with pagination
   */
  async getSurveys(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    let query = `
      SELECT 
        ps.id,
        ps.name_en as survey_name,
        ps.approval_status,
        ps.createdAt
      FROM PublicSurveys ps
      WHERE ps.deletedAt IS NULL
    `;

    // Add date filter if provided
    if (startDate) {
      query += ` AND ps.createdAt >= '${startDate}'`;
    }
    if (endDate) {
      query += ` AND ps.createdAt <= '${endDate}'`;
    }

    query += ` ORDER BY ps.createdAt DESC OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY`;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM PublicSurveys ps
      WHERE ps.deletedAt IS NULL
      ${startDate ? ` AND ps.createdAt >= '${startDate}'` : ''}
      ${endDate ? ` AND ps.createdAt <= '${endDate}'` : ''}
    `;

    const [data, countResult] = await Promise.all([
      this.databaseService.query(query),
      this.databaseService.query(countQuery)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitInt);

    return {
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  /**
   * Get compliance details with pagination
   */
  async getComplianceDetails(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    // Use report 6 query as base with filters
    let query = this.getSqlForReport('6', startDate, endDate, functionId, access);
    
    // Add pagination - wrap the original query
    const paginatedQuery = `
      SELECT * FROM (
        ${query}
      ) AS subquery
      ORDER BY [code]
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        ${query}
      ) AS subquery
    `;

    const [data, countResult] = await Promise.all([
      this.databaseService.query(paginatedQuery),
      this.databaseService.query(countQuery)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitInt);

    // Transform data to match frontend expectations (map 'compliance' to 'compliance_name')
    const transformedData = data.map((row: any) => ({
      ...row,
      compliance_name: row.compliance || row.complianceItem_en || row.compliance_name || 'N/A'
    }));

    return {
      data: transformedData,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  /**
   * Get survey completion rate with pagination
   */
  async getSurveyCompletionRate(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    // Use report 1 query as base with filters
    let query = this.getSqlForReport('1', startDate, endDate, functionId, access);
    
    const paginatedQuery = `
      SELECT * FROM (
        ${query}
      ) AS subquery
      ORDER BY name_en
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        ${query}
      ) AS subquery
    `;

    const [data, countResult] = await Promise.all([
      this.databaseService.query(paginatedQuery),
      this.databaseService.query(countQuery)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitInt);

    // Transform data to match expected format
    const transformedData = data.map((row: any) => ({
      survey_name: row.name_en,
      completion_rate: row.completion_rate || 0,
      total_questions: row.assigned || 0,
      answered_questions: row.completed || 0
    }));

    return {
      data: transformedData,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  /**
   * Get compliance controls without evidence with pagination
   */
  async getComplianceWithoutEvidence(user: any, page: number = 1, limit: number = 10, startDate?: string, endDate?: string, functionId?: string) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    // Use report 13 query as base with filters
    let query = this.getSqlForReport('13', startDate, endDate, functionId, access);
    
    const paginatedQuery = `
      SELECT * FROM (
        ${query}
      ) AS subquery
      ORDER BY ControlName
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM (
        ${query}
      ) AS subquery
    `;

    const [data, countResult] = await Promise.all([
      this.databaseService.query(paginatedQuery),
      this.databaseService.query(countQuery)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitInt);

    // Transform data to match frontend expectations (map PascalCase to snake_case)
    const transformedData = data.map((row: any) => ({
      ...row,
      control_name: row.ControlName || row.control_name || 'N/A',
      compliance_name: row.ComplianceName || row.compliance_name || 'N/A',
      category: row.DomainName || row.category || 'N/A'
    }));

    return {
      data: transformedData,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages,
        hasNext: pageInt < totalPages,
        hasPrev: pageInt > 1
      }
    };
  }

  /**
   * Get paginated report data
   */
  async getPaginatedReport(
    report: GrcComplyReportKey,
    user: any,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    // Get user function access
    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    // Get the SQL query
    const sqlQuery = this.getSqlForReport(report, startDate, endDate, functionId, access);

    if (!sqlQuery) {
      throw new BadRequestException(`Unknown report id: ${report}`);
    }

    // Add pagination to the query
    // Check if the query already has ORDER BY
    const orderByMatch = sqlQuery.match(/ORDER\s+BY\s+([^;]+?)(?:\s*;)?$/i);
    
    let paginatedQuery: string;
    if (orderByMatch) {
      // Query already has ORDER BY, append OFFSET/FETCH after it
      const orderByClause = orderByMatch[1].trim();
      const queryWithoutOrderBy = sqlQuery.replace(/ORDER\s+BY\s+[^;]+(?:\s*;)?$/i, '').trim();
      paginatedQuery = `
        ${queryWithoutOrderBy}
        ORDER BY ${orderByClause}
        OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      `;
    } else {
      // No ORDER BY, wrap and add one using first column
      // Extract first column from SELECT
      const selectMatch = sqlQuery.match(/SELECT\s+(?:TOP\s+\d+\s+)?(?:DISTINCT\s+)?(.+?)\s+FROM/i);
      let orderColumn = '1'; // Default to column position
      
      if (selectMatch) {
        const selectList = selectMatch[1];
        // Try to find first actual column (skip AS aliases)
        const firstColMatch = selectList.match(/^([^\s,]+(?:\.[^\s,]+)?)/);
        if (firstColMatch) {
          orderColumn = firstColMatch[1];
        }
      }
      
      paginatedQuery = `
        SELECT * FROM (
          ${sqlQuery}
        ) AS subquery
        ORDER BY ${orderColumn}
        OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
      `;
    }

    // Get total count - wrap the original query in COUNT
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        ${sqlQuery}
      ) AS count_subquery
    `;

    try {
      const [data, countResult] = await Promise.all([
        this.databaseService.query(paginatedQuery),
        this.databaseService.query(countQuery),
      ]);

      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limitInt);

      return {
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages,
          hasNext: pageInt < totalPages,
          hasPrev: pageInt > 1,
        },
      };
    } catch (error) {
      console.error(`[GrcComplyService.getPaginatedReport] Error fetching report ${report}:`, error);
      throw error;
    }
  }
}


