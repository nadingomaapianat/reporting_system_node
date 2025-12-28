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
FROM ${fq('Compliances')} C
LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
WHERE C.[deletedAt] IS NULL ${complianceDateFilter} ${complianceFunctionFilter}
ORDER BY C.[code]
`;

      case '7':
        const impactedAreaDateFilter = this.buildDateFilter(startDate, endDate, 'sia.createdAt');
        const impactedAreaControlFunctionFilter = this.buildControlFunctionFilterForComply('ctrl', userAccess, functionId);
        
        return `
SELECT
  ia.name AS impacted_area,
  COUNT(DISTINCT ctrl.id) AS control_links
FROM survey_impacted_area sia
JOIN ImpactedAreas ia ON ia.id = sia.impactedAreaId
LEFT JOIN ${fq('ComplianceControlActions')} CCA ON CCA.id = sia.complianceControlActionId AND CCA.deletedAt IS NULL
LEFT JOIN ${fq('Controls')} ctrl ON ctrl.id = CCA.control_id AND ctrl.deletedAt IS NULL
WHERE sia.deletedAt IS NULL 
  AND ctrl.id IS NOT NULL ${impactedAreaDateFilter} ${impactedAreaControlFunctionFilter}
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
  (SELECT CODE FROM ${fq('Domains')} WHERE id = D.id) AS FunctionID,
  (SELECT [en_name]
   FROM ${fq('Domains')}
   WHERE ID IN (SELECT parentId FROM ${fq('Domains')} WHERE id = D.id)
  ) AS Functionn,
  D.[en_name] AS Domain,
  Controls.CODE AS ControlCode,
  Controls.name AS ControlName
FROM ${fq('Compliances')} C,
     ${fq('complianceReferences')} CR,
     ControlReferences CRE,
     ${fq('Domains')} D,
     ${fq('controlDomains')} CD,
     ${fq('Controls')} Controls
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
        const complianceEvidenceDateFilter = this.buildDateFilter(startDate, endDate, `${fq('ComplianceControlActions')}.[createdAt]`);
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
  FROM ${fq('ComplianceControlActions')}
  WHERE [evidence] IS NULL
    AND [deletedAt] IS NULL ${complianceEvidenceDateFilter}
  GROUP BY compliance_id, domain_id, control_id, [evidence]
) AS CCA
JOIN ${fq('Compliances')} C ON C.id = CCA.compliance_id
LEFT JOIN ${fq('Domains')} D ON D.id = CCA.domain_id
LEFT JOIN ${fq('Controls')} Ctrl ON Ctrl.id = CCA.control_id
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
FROM ${fq('BankQuestions')}
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
FROM ${fq('Compliances')} C
LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
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
FROM ${fq('Compliances')} C
LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
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
FROM ${fq('Compliances')} C
LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
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

  /**
   * Detail methods for chart drill-downs
   */
  async getSurveysByStatus(
    user: any,
    status: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const dateFilter = this.buildDateFilter(startDate, endDate, 'ps.createdAt');
    const query = `
      SELECT 
        ps.id,
        ps.name_en as survey_name,
        ps.approval_status,
        ps.createdAt
      FROM PublicSurveys ps
      WHERE ps.deletedAt IS NULL 
        AND ps.approval_status = '${status.replace(/'/g, "''")}' ${dateFilter}
      ORDER BY ps.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM PublicSurveys ps
      WHERE ps.deletedAt IS NULL 
        AND ps.approval_status = '${status.replace(/'/g, "''")}' ${dateFilter}
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

  async getComplianceByStatus(
    user: any,
    status: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'C.[createdAt]');
    const functionFilter = this.buildComplianceFunctionFilter(access, functionId);
    
    const query = `
      SELECT DISTINCT
        C.[code] AS ComplianceCode,
        C.[complianceItem_en],
        C.[complianceStatus],
        C.[progress],
        C.[progressStatus],
        C.[quarter],
        C.[year],
        C.[approval_status],
        cre.code AS StandardCode,
        CRE.NAME AS StandardName,
        (SELECT CODE FROM ${fq('Domains')} WHERE id = D.id) AS FunctionID,
        (SELECT [en_name]
         FROM ${fq('Domains')}
         WHERE ID IN (SELECT parentId FROM ${fq('Domains')} WHERE id = D.id)
        ) AS Functionn,
        D.[en_name] AS Domain
      FROM ${fq('Compliances')} C
      LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
      LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
      LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
      LEFT JOIN ControlReferences CRE ON CR.reference_id = CRE.id
      WHERE C.[deletedAt] IS NULL 
        AND C.[complianceStatus] = '${status.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
      ORDER BY C.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT C.[id]) as total
      FROM ${fq('Compliances')} C
      LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
      LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
      LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
      WHERE C.[deletedAt] IS NULL 
        AND C.[complianceStatus] = '${status.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
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

  async getComplianceByProgress(
    user: any,
    progressStatus: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'C.[createdAt]');
    const functionFilter = this.buildComplianceFunctionFilter(access, functionId);
    
    const query = `
      SELECT DISTINCT
        C.[code] AS ComplianceCode,
        C.[complianceItem_en],
        C.[complianceStatus],
        C.[progress],
        C.[progressStatus],
        C.[quarter],
        C.[year],
        C.[approval_status],
        cre.code AS StandardCode,
        CRE.NAME AS StandardName,
        (SELECT CODE FROM ${fq('Domains')} WHERE id = D.id) AS FunctionID,
        (SELECT [en_name]
         FROM ${fq('Domains')}
         WHERE ID IN (SELECT parentId FROM ${fq('Domains')} WHERE id = D.id)
        ) AS Functionn,
        D.[en_name] AS Domain
      FROM ${fq('Compliances')} C
      LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
      LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
      LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
      LEFT JOIN ControlReferences CRE ON CR.reference_id = CRE.id
      WHERE C.[deletedAt] IS NULL 
        AND C.[progressStatus] = '${progressStatus.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
      ORDER BY C.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT C.[id]) as total
      FROM ${fq('Compliances')} C
      LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
      LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
      LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
      WHERE C.[deletedAt] IS NULL 
        AND C.[progressStatus] = '${progressStatus.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
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

  async getComplianceByApproval(
    user: any,
    approvalStatus: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'C.[createdAt]');
    const functionFilter = this.buildComplianceFunctionFilter(access, functionId);
    
    const query = `
      SELECT DISTINCT
        C.[code] AS ComplianceCode,
        C.[complianceItem_en],
        C.[complianceStatus],
        C.[progress],
        C.[progressStatus],
        C.[quarter],
        C.[year],
        C.[approval_status],
        cre.code AS StandardCode,
        CRE.NAME AS StandardName,
        (SELECT CODE FROM ${fq('Domains')} WHERE id = D.id) AS FunctionID,
        (SELECT [en_name]
         FROM ${fq('Domains')}
         WHERE ID IN (SELECT parentId FROM ${fq('Domains')} WHERE id = D.id)
        ) AS Functionn,
        D.[en_name] AS Domain
      FROM ${fq('Compliances')} C
      LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
      LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
      LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
      LEFT JOIN ControlReferences CRE ON CR.reference_id = CRE.id
      WHERE C.[deletedAt] IS NULL 
        AND C.[approval_status] = '${approvalStatus.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
      ORDER BY C.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT C.[id]) as total
      FROM ${fq('Compliances')} C
      LEFT JOIN ${fq('complianceReferences')} CR ON C.id = CR.compliance_id
      LEFT JOIN ${fq('controlDomains')} CD ON CR.reference_id = CD.domain_id
      LEFT JOIN ${fq('Domains')} D ON CD.domain_id = D.id
      WHERE C.[deletedAt] IS NULL 
        AND C.[approval_status] = '${approvalStatus.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
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

  async getAvgScoreBySurvey(
    user: any,
    surveyName: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
    const functionFilter = this.buildSurveyUserFunctionFilter(access, functionId, 'sa.userId');
    
    const query = `
      SELECT 
        sa.id,
        sa.surveyId,
        ps.name_en AS survey_name,
        bq.question_en AS question,
        sa.answer,
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
        END AS maturity_score,
        sa.createdAt
      FROM survey_assessment sa
      JOIN PublicSurveys ps ON sa.surveyId = ps.id
      LEFT JOIN BankQuestions bq ON sa.questionId = bq.id
      WHERE ps.name_en = '${surveyName.replace(/'/g, "''")}'
        AND CASE 
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
        END IS NOT NULL ${dateFilter} ${functionFilter}
      ORDER BY sa.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM survey_assessment sa
      JOIN PublicSurveys ps ON sa.surveyId = ps.id
      WHERE ps.name_en = '${surveyName.replace(/'/g, "''")}'
        AND CASE 
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
        END IS NOT NULL ${dateFilter} ${functionFilter}
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

  async getComplianceByCategory(
    user: any,
    category: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
    // Build function filter similar to report 16
    let functionFilter = '';
    if (functionId) {
      if (!access.isSuperAdmin && !access.functionIds.includes(functionId)) {
        functionFilter = ' AND 1 = 0';
      } else {
        functionFilter = ` AND EXISTS (
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
    } else if (!access.isSuperAdmin) {
      if (!access.functionIds.length) {
        functionFilter = ' AND 1 = 0';
      } else {
        const ids = access.functionIds.map((id) => `'${id}'`).join(', ');
        functionFilter = ` AND EXISTS (
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
    
    const query = `
      SELECT DISTINCT
        C.[code] AS ComplianceCode,
        C.[complianceItem_en],
        C.[complianceStatus],
        cat.name AS category_name,
        sa.answer,
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
        END AS maturity_score
      FROM survey_assessment sa
      JOIN PublicSurveys ps ON sa.surveyId = ps.id
      JOIN BankQuestions bq ON sa.questionId = bq.id
      JOIN Categories cat ON bq.categoryId = cat.id
      LEFT JOIN BankQuestionControls bqc ON bq.id = bqc.bank_question_id
      LEFT JOIN Controls ctrl ON bqc.control_id = ctrl.id
      LEFT JOIN ${fq('ComplianceControlActions')} CCA ON ctrl.id = CCA.control_id AND CCA.deletedAt IS NULL
      LEFT JOIN ${fq('Compliances')} C ON C.id = CCA.compliance_id
      WHERE cat.name = '${category.replace(/'/g, "''")}'
        AND (C.deletedAt IS NULL OR C.id IS NULL)
        AND CASE 
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
        END IS NOT NULL ${dateFilter} ${functionFilter}
      ORDER BY C.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT C.[id]) as total
      FROM survey_assessment sa
      JOIN PublicSurveys ps ON sa.surveyId = ps.id
      JOIN BankQuestions bq ON sa.questionId = bq.id
      JOIN Categories cat ON bq.categoryId = cat.id
      LEFT JOIN BankQuestionControls bqc ON bq.id = bqc.bank_question_id
      LEFT JOIN Controls ctrl ON bqc.control_id = ctrl.id
      LEFT JOIN ${fq('ComplianceControlActions')} CCA ON ctrl.id = CCA.control_id AND CCA.deletedAt IS NULL
      LEFT JOIN ${fq('Compliances')} C ON C.id = CCA.compliance_id
      WHERE cat.name = '${category.replace(/'/g, "''")}'
        AND (C.deletedAt IS NULL OR C.id IS NULL)
        AND CASE 
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
        END IS NOT NULL ${dateFilter} ${functionFilter}
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

  async getTopFailedControls(
    user: any,
    controlName: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
    const functionFilter = this.buildSurveyUserFunctionFilter(access, functionId, 'sa.userId');
    
    const query = `
      SELECT 
        sa.id,
        ctrl.name AS control_name,
        ctrl.code AS control_code,
        bq.question_en AS question,
        sa.answer,
        ps.name_en AS survey_name,
        sa.createdAt
      FROM survey_assessment sa
      JOIN PublicSurveys ps ON sa.surveyId = ps.id
      JOIN BankQuestions bq ON sa.questionId = bq.id
      JOIN BankQuestionControls bqc ON bq.id = bqc.bank_question_id
      JOIN Controls ctrl ON bqc.control_id = ctrl.id
      WHERE ctrl.name = '${controlName.replace(/'/g, "''")}'
        AND (sa.answer LIKE '%Not Implemented%' 
          OR sa.answer LIKE '%Minimal%' 
          OR sa.answer LIKE '%Least%')
        AND bqc.deletedAt IS NULL
        AND ctrl.deletedAt IS NULL ${dateFilter} ${functionFilter}
      ORDER BY sa.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM survey_assessment sa
      JOIN PublicSurveys ps ON sa.surveyId = ps.id
      JOIN BankQuestions bq ON sa.questionId = bq.id
      JOIN BankQuestionControls bqc ON bq.id = bqc.bank_question_id
      JOIN Controls ctrl ON bqc.control_id = ctrl.id
      WHERE ctrl.name = '${controlName.replace(/'/g, "''")}'
        AND (sa.answer LIKE '%Not Implemented%' 
          OR sa.answer LIKE '%Minimal%' 
          OR sa.answer LIKE '%Least%')
        AND bqc.deletedAt IS NULL
        AND ctrl.deletedAt IS NULL ${dateFilter} ${functionFilter}
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

  async getControlsByCategory(
    user: any,
    category: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
    const functionFilter = this.buildControlFunctionFilterForComply('Controls', access, functionId);
    
    const query = `
      SELECT DISTINCT
        Controls.code AS control_code,
        Controls.name AS control_name,
        Categories.name AS category,
        BankQuestions.code AS question_code,
        BankQuestions.question_en AS question
      FROM BankQuestionControls
      JOIN Controls ON BankQuestionControls.control_id = Controls.id
      JOIN BankQuestions ON BankQuestions.id = BankQuestionControls.bank_question_id
      JOIN Categories ON BankQuestions.categoryId = Categories.id
      WHERE BankQuestions.[deletedAt] IS NULL
        AND Categories.name = '${category.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
      ORDER BY Controls.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT Controls.id) as total
      FROM BankQuestionControls
      JOIN Controls ON BankQuestionControls.control_id = Controls.id
      JOIN BankQuestions ON BankQuestions.id = BankQuestionControls.bank_question_id
      JOIN Categories ON BankQuestions.categoryId = Categories.id
      WHERE BankQuestions.[deletedAt] IS NULL
        AND Categories.name = '${category.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
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

  async getRisksByCategory(
    user: any,
    category: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
    const functionFilter = this.buildRiskFunctionFilterForComply('Risks', access, functionId);
    
    const query = `
      SELECT DISTINCT
        Risks.code AS risk_code,
        Risks.name AS risk_name,
        Categories.name AS category,
        BankQuestions.code AS question_code,
        BankQuestions.question_en AS question
      FROM BankQuestionRisks
      JOIN Risks ON BankQuestionRisks.risk_id = Risks.id
      JOIN BankQuestions ON BankQuestions.id = BankQuestionRisks.bank_question_id
      JOIN Categories ON BankQuestions.categoryId = Categories.id
      WHERE BankQuestions.[deletedAt] IS NULL
        AND Categories.name = '${category.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
      ORDER BY Risks.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT Risks.id) as total
      FROM BankQuestionRisks
      JOIN Risks ON BankQuestionRisks.risk_id = Risks.id
      JOIN BankQuestions ON BankQuestions.id = BankQuestionRisks.bank_question_id
      JOIN Categories ON BankQuestions.categoryId = Categories.id
      WHERE BankQuestions.[deletedAt] IS NULL
        AND Categories.name = '${category.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
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

  async getImpactedAreasByMonth(
    user: any,
    month: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    // Parse month (format: YYYY-MM) and build date range
    const [year, monthNum] = month.split('-');
    const monthStart = `${year}-${monthNum}-01`;
    const nextMonth = parseInt(monthNum) === 12 ? `${parseInt(year) + 1}-01-01` : `${year}-${String(parseInt(monthNum) + 1).padStart(2, '0')}-01`;
    
    const query = `
      SELECT 
        sia.id,
        ia.name AS name,
        sia.createdAt,
        COUNT(DISTINCT ctrl.id) AS linked_controls_count
      FROM survey_impacted_area sia
      LEFT JOIN ImpactedAreas ia ON ia.id = sia.impactedAreaId
      LEFT JOIN ${fq('ComplianceControlActions')} CCA ON CCA.id = sia.complianceControlActionId AND CCA.deletedAt IS NULL
      LEFT JOIN Controls ctrl ON ctrl.id = CCA.control_id AND ctrl.deletedAt IS NULL
      WHERE sia.deletedAt IS NULL
        AND CAST(sia.createdAt AS DATE) >= CAST('${monthStart}' AS DATE)
        AND CAST(sia.createdAt AS DATE) < CAST('${nextMonth}' AS DATE)
      GROUP BY sia.id, ia.name, sia.createdAt
      ORDER BY sia.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT sia.id) as total
      FROM survey_impacted_area sia
      WHERE sia.deletedAt IS NULL
        AND CAST(sia.createdAt AS DATE) >= CAST('${monthStart}' AS DATE)
        AND CAST(sia.createdAt AS DATE) < CAST('${nextMonth}' AS DATE)
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

  async getQuestionsByType(
    user: any,
    questionType: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const dateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
    
    const query = `
      SELECT 
        BankQuestions.code AS question_code,
        BankQuestions.question_en AS question,
        BankQuestions.question_type,
        Categories.name AS category_name,
        BankQuestions.createdAt
      FROM ${fq('BankQuestions')}
      LEFT JOIN Categories ON BankQuestions.categoryId = Categories.id
      WHERE BankQuestions.[deletedAt] IS NULL
        AND BankQuestions.question_type = '${questionType.replace(/'/g, "''")}' ${dateFilter}
      ORDER BY BankQuestions.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${fq('BankQuestions')}
      WHERE [deletedAt] IS NULL
        AND question_type = '${questionType.replace(/'/g, "''")}' ${dateFilter}
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

  async getQuestionsByReference(
    user: any,
    referenceName: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const dateFilter = this.buildDateFilter(startDate, endDate, 'BankQuestions.[createdAt]');
    
    const query = `
      SELECT 
        BankQuestions.code AS question_code,
        BankQuestions.question_en AS question,
        ControlReferences.name AS Referencename,
        Categories.name AS category_name,
        BankQuestions.createdAt
      FROM ${fq('BankQuestions')}
      JOIN ${fq('ControlReferences')} ON BankQuestions.reference_id = ControlReferences.id
      LEFT JOIN Categories ON BankQuestions.categoryId = Categories.id
      WHERE BankQuestions.[deletedAt] IS NULL
        AND ControlReferences.name = '${referenceName.replace(/'/g, "''")}' ${dateFilter}
      ORDER BY BankQuestions.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${fq('BankQuestions')}
      JOIN ${fq('ControlReferences')} ON BankQuestions.reference_id = ControlReferences.id
      WHERE BankQuestions.[deletedAt] IS NULL
        AND ControlReferences.name = '${referenceName.replace(/'/g, "''")}' ${dateFilter}
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

  async getControlsByDomain(
    user: any,
    domain: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'controls.[createdAt]');
    const functionFilter = this.buildControlFunctionFilterForComply('controls', access, functionId);
    
    const query = `
      SELECT DISTINCT
        controls.code AS control_code,
        controls.name AS control_name,
        Domains.en_name AS Domain,
        controls.createdAt
      FROM ${fq('controlDomains')}
      JOIN ${fq('Domains')} ON controlDomains.domain_id = Domains.id
      JOIN ${fq('controls')} ON controlDomains.control_id = controls.id
      WHERE controls.[deletedAt] IS NULL
        AND Domains.en_name = '${domain.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
      ORDER BY controls.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT controls.id) as total
      FROM ${fq('controlDomains')}
      JOIN ${fq('Domains')} ON controlDomains.domain_id = Domains.id
      JOIN ${fq('controls')} ON controlDomains.control_id = controls.id
      WHERE controls.[deletedAt] IS NULL
        AND Domains.en_name = '${domain.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
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

  async getAnswersByFunction(
    user: any,
    functionName: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
    const functionFilter = this.buildSurveyFunctionFilter(access, functionId, 'f');
    
    const query = `
      SELECT 
        sa.id,
        sa.answer,
        sa.createdAt,
        ps.name_en AS survey_name,
        bq.question_en AS question,
        u.name AS user_name
      FROM survey_assessment sa
      JOIN Users u ON sa.userId = u.id
      JOIN UserFunction uf ON uf.userId = u.id AND uf.deletedAt IS NULL
      JOIN Functions f ON f.id = uf.functionId AND f.deletedAt IS NULL
      LEFT JOIN PublicSurveys ps ON sa.surveyId = ps.id
      LEFT JOIN BankQuestions bq ON sa.questionId = bq.id
      WHERE f.name = '${functionName.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
      ORDER BY sa.createdAt DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM survey_assessment sa
      JOIN Users u ON sa.userId = u.id
      JOIN UserFunction uf ON uf.userId = u.id AND uf.deletedAt IS NULL
      JOIN Functions f ON f.id = uf.functionId AND f.deletedAt IS NULL
      WHERE f.name = '${functionName.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
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

  async getQuestionsBySurveyAndCategory(
    user: any,
    surveyName: string,
    categoryName: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'sa.createdAt');
    const functionFilter = this.buildSurveyUserFunctionFilter(access, functionId, 'sa.userId');
    
    const query = `
      SELECT 
        sa.id,
        bq.code AS question_code,
        bq.question_en AS question,
        sa.answer,
        ps.name_en AS survey_name,
        c.name AS category_name,
        sa.createdAt
      FROM survey_assessment sa
      JOIN PublicSurveys ps ON ps.id = sa.surveyId
      JOIN BankQuestions bq ON sa.questionId = bq.id
      JOIN Categories c ON c.id = bq.categoryId
      WHERE ps.name_en = '${surveyName.replace(/'/g, "''")}'
        AND c.name = '${categoryName.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
      ORDER BY bq.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM survey_assessment sa
      JOIN PublicSurveys ps ON ps.id = sa.surveyId
      JOIN BankQuestions bq ON sa.questionId = bq.id
      JOIN Categories c ON c.id = bq.categoryId
      WHERE ps.name_en = '${surveyName.replace(/'/g, "''")}'
        AND c.name = '${categoryName.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
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

  async getQuestionsByCategory(
    user: any,
    categoryName: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const dateFilter = this.buildDateFilter(startDate, endDate, 'bq.[createdAt]');
    
    const query = `
      SELECT 
        bq.code AS question_code,
        bq.question_en AS question,
        bq.question_type,
        c.name AS category_name,
        bq.createdAt
      FROM ${fq('BankQuestions')} bq
      JOIN Categories c ON bq.categoryId = c.id
      WHERE bq.[deletedAt] IS NULL
        AND c.name = '${categoryName.replace(/'/g, "''")}' ${dateFilter}
      ORDER BY bq.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${fq('BankQuestions')} bq
      JOIN Categories c ON bq.categoryId = c.id
      WHERE bq.[deletedAt] IS NULL
        AND c.name = '${categoryName.replace(/'/g, "''")}' ${dateFilter}
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

  async getControlsByImpactedArea(
    user: any,
    impactedAreaName: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
    functionId?: string
  ) {
    const pageInt = Math.floor(Number(page)) || 1;
    const limitInt = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (pageInt - 1) * limitInt;

    const access: UserFunctionAccess = await this.userFunctionAccess.getUserFunctionAccess(
      user.id,
      user.groupName,
    );

    const dateFilter = this.buildDateFilter(startDate, endDate, 'sia.createdAt');
    const functionFilter = this.buildControlFunctionFilterForComply('ctrl', access, functionId);
    
    const query = `
      SELECT DISTINCT
        ctrl.code AS control_code,
        ctrl.name AS control_name,
        ia.name AS impacted_area,
        ctrl.createdAt
      FROM survey_impacted_area sia
      JOIN ImpactedAreas ia ON ia.id = sia.impactedAreaId
      LEFT JOIN ${fq('ComplianceControlActions')} CCA ON CCA.id = sia.complianceControlActionId AND CCA.deletedAt IS NULL
      LEFT JOIN ${fq('Controls')} ctrl ON ctrl.id = CCA.control_id AND ctrl.deletedAt IS NULL
      WHERE sia.deletedAt IS NULL
        AND ia.name = '${impactedAreaName.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
        AND ctrl.id IS NOT NULL
      ORDER BY ctrl.code
      OFFSET ${offset} ROWS FETCH NEXT ${limitInt} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT ctrl.id) as total
      FROM survey_impacted_area sia
      JOIN ImpactedAreas ia ON ia.id = sia.impactedAreaId
      LEFT JOIN ${fq('ComplianceControlActions')} CCA ON CCA.id = sia.complianceControlActionId AND CCA.deletedAt IS NULL
      LEFT JOIN ${fq('Controls')} ctrl ON ctrl.id = CCA.control_id AND ctrl.deletedAt IS NULL
      WHERE sia.deletedAt IS NULL
        AND ia.name = '${impactedAreaName.replace(/'/g, "''")}' ${dateFilter} ${functionFilter}
        AND ctrl.id IS NOT NULL
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
}


