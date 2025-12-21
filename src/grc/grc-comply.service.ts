import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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
  constructor(private readonly databaseService: DatabaseService) {}

  async runReport(report: GrcComplyReportKey) {
    const sqlQuery = this.getSqlForReport(report);

    if (!sqlQuery) {
      throw new BadRequestException(`Unknown report id: ${report}`);
    }

    return this.databaseService.query(sqlQuery);
  }

  async runAllReports() {
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

    const results = await Promise.all(
      reportKeys.map((key) => this.runReport(key)),
    );

    const combined: Record<string, any> = {};

    reportKeys.forEach((key, index) => {
      const name = reportNames[key] || key;
      combined[name] = results[index];
    });

    return combined;
  }

  private getSqlForReport(report: GrcComplyReportKey): string {
    switch (report) {
      case '1':
        return `
SELECT
  ps.name_en,
  COUNT(DISTINCT psu.userId) AS assigned,
  COUNT(DISTINCT sa.userId) AS completed,
  COUNT(DISTINCT sa.userId) * 100.0 / NULLIF(COUNT(DISTINCT psu.userId), 0) AS completion_rate
FROM PublicSurveys ps
LEFT JOIN PublicSurveyUsers psu ON ps.id = psu.publicSurveyId
LEFT JOIN survey_assessment sa ON sa.surveyId = ps.id
GROUP BY ps.id, ps.name_en
`;

      case '2':
        return `
SELECT
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
ORDER BY BankQuestions.[code]
`;

      case '3':
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
`;

      case '4':
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
ORDER BY Categories.name,
         Controls.name
`;

      case '5':
        return `
SELECT
  Domains.en_name AS Domain,
  controls.name AS Control
FROM [controlDomains],
     Domains,
     controls
WHERE controlDomains.domain_id = Domains.id
  AND controlDomains.control_id = controls.id
ORDER BY Domains.en_name,
         controls.name
`;

      case '6':
        return `
SELECT
  [code],
  [complianceItem_en] AS compliance,
  [complianceStatus],
  [progress],
  [progressStatus],
  [quarter],
  [year],
  [approval_status],
  [createdAt]
FROM [NEWDCC-V4-UAT].[dbo].[Compliances]
ORDER BY [code]
`;

      case '7':
        return `
SELECT
  ia.name AS impacted_area,
  COUNT(sia.id) AS control_links
FROM survey_impacted_area sia
JOIN ImpactedAreas ia ON ia.id = sia.impactedAreaId
WHERE sia.deletedAt IS NULL
GROUP BY ia.name
ORDER BY control_links DESC
`;

      case '8':
        return `
SELECT
  f.name AS function_name,
  COUNT(DISTINCT psu.userId) AS participants
FROM PublicSurveyUsers psu
JOIN Users u ON u.id = psu.userId
JOIN UserFunction uf ON uf.userId = u.id AND uf.deletedAt IS NULL
JOIN Functions f ON f.id = uf.functionId AND f.deletedAt IS NULL
GROUP BY f.name
ORDER BY participants DESC
`;

      case '9':
        return `
SELECT
  f.name AS function_name,
  COUNT(sa.id) AS total_answers
FROM survey_assessment sa
JOIN Users u ON sa.userId = u.id
JOIN UserFunction uf ON uf.userId = u.id AND uf.deletedAt IS NULL
JOIN Functions f ON f.id = uf.functionId AND f.deletedAt IS NULL
GROUP BY f.name
ORDER BY total_answers DESC
`;

      case '10':
        return `
SELECT
  ps.name_en AS survey_name,
  c.name AS category_name,
  COUNT(*) AS question_count
FROM survey_assessment sa
JOIN PublicSurveys ps ON ps.id = sa.surveyId
JOIN BankQuestions bq ON sa.questionId = bq.id
JOIN Categories c ON c.id = bq.categoryId
GROUP BY ps.name_en, c.name
ORDER BY ps.name_en, c.name
`;

      case '11':
        return `
SELECT
  c.name AS category_name,
  COUNT(*) AS total_questions
FROM BankQuestions bq
JOIN Categories c ON bq.categoryId = c.id
GROUP BY c.name
ORDER BY total_questions DESC
`;

      case '12':
        return `
SELECT
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
ORDER BY C.code,
         cre.code,
         FunctionID,
         D.id,
         Controls.CODE
`;

      case '13':
        return `
SELECT
  (SELECT CODE
   FROM [NEWDCC-V4-UAT].[dbo].[Compliances]
   WHERE ID = CCA.compliance_id
  ) AS ComplianceCode,
  (SELECT [complianceItem_en]
   FROM [NEWDCC-V4-UAT].[dbo].[Compliances]
   WHERE ID = CCA.compliance_id
  ) AS ComplianceName,
  (SELECT CODE
   FROM [NEWDCC-V4-UAT].[dbo].[Domains]
   WHERE ID = CCA.domain_id
  ) AS DomainCode,
  (SELECT [en_name]
   FROM [NEWDCC-V4-UAT].[dbo].[Domains]
   WHERE ID = CCA.domain_id
  ) AS DomainName,
  (SELECT CODE
   FROM [NEWDCC-V4-UAT].[dbo].[Controls]
   WHERE ID = CCA.control_id
  ) AS ControlCode,
  (SELECT [name]
   FROM [NEWDCC-V4-UAT].[dbo].[Controls]
   WHERE ID = CCA.control_id
  ) AS ControlName,
  [evidence]
FROM [NEWDCC-V4-UAT].[dbo].[ComplianceControlActions] CCA
WHERE [evidence] IS NULL
ORDER BY ComplianceCode,
         DomainCode,
         ControlCode
`;

      case '14':
        return `
SELECT 
  approval_status,
  COUNT(*) AS total
FROM PublicSurveys
GROUP BY approval_status;
`;

      case '15':
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
  END IS NOT NULL
GROUP BY 
  ps.name_en;
`;

      case '16':
        return `
SELECT 
  c.name AS category_name,
  AVG(maturity_score) AS avg_maturity_score
FROM (
  SELECT
    sa.id,
    sa.answer,
    bq.categoryId,
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
) AS x
JOIN Categories c ON x.categoryId = c.id
WHERE maturity_score IS NOT NULL
GROUP BY c.name
ORDER BY avg_maturity_score DESC;
`;

      case '17':
        return `
SELECT TOP 10
  ctrl.name AS control_name,
  COUNT(*) AS failed_count
FROM (
  SELECT
    sa.id,
    sa.answer,
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
) AS x
JOIN Controls ctrl ON ctrl.id = x.control_id
WHERE score IN (1, 2)
GROUP BY ctrl.name
ORDER BY failed_count DESC;
`;

      case '18':
        return `
SELECT
  question_type,
  COUNT(code) AS count
FROM [NEWDCC-V4-UAT].[dbo].BankQuestions
GROUP BY question_type;
`;

      case '19':
        return `
SELECT
  ControlReferences.name AS Referencename,
  COUNT(BankQuestions.code) AS count
FROM BankQuestions,
     ControlReferences
WHERE BankQuestions.reference_id = ControlReferences.id
GROUP BY ControlReferences.name;
`;

      case '20':
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
GROUP BY Categories.name;
`;

      case '21':
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
GROUP BY Categories.name;
`;

      case '22':
        return `
SELECT
  Domains.en_name AS Domain,
  COUNT([controlDomains].control_id) AS ControlNos
FROM [controlDomains],
     Domains
WHERE controlDomains.domain_id = Domains.id
GROUP BY Domains.en_name;
`;

      case '23':
        return `
SELECT
  COUNT([id]) AS Compliance,
  [complianceStatus]
FROM [NEWDCC-V4-UAT].[dbo].[Compliances]
GROUP BY [complianceStatus];
`;

      case '24':
        return `
SELECT
  COUNT([id]) AS Compliance,
  [progressStatus]
FROM [NEWDCC-V4-UAT].[dbo].[Compliances]
GROUP BY [progressStatus];
`;

      case '25':
        return `
SELECT
  COUNT([id]) AS Compliance,
  [approval_status]
FROM [NEWDCC-V4-UAT].[dbo].[Compliances]
GROUP BY [approval_status];
`;

      case '26':
        return `
SELECT 
  FORMAT(sia.createdAt, 'yyyy-MM') AS month,
  COUNT(*) AS impacted_area_count
FROM survey_impacted_area sia
WHERE sia.deletedAt IS NULL
GROUP BY FORMAT(sia.createdAt, 'yyyy-MM')
ORDER BY month;
`;

      default:
        return '';
    }
  }
}


