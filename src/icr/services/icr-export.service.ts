import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IcrService } from './icr.service';
import { IcrTemplateAdminService } from './icr-template-admin.service';
import { IcrTagConfigService } from './icr-tag-config.service';
import { IcrReportRecord } from '../interfaces/icr-report.types';

export type ExportFormat = 'WORD' | 'PDF' | 'BOTH';

interface FindingRow {
  activity: string;
  component: string;
  high: number;
  medium: number;
  low: number;
}

interface TemplatePayload {
  report_year: number;
  report_month: number;
  net_profit: number;
  profit_growth_pct: number;
  staff_count: number;
  branch_count: number;
  loan_deposit_ratio: number;
  overall_rating: string;
  findings: FindingRow[];
  format: 'WORD' | 'PDF';
}

@Injectable()
export class IcrExportService {
  private readonly logger = new Logger(IcrExportService.name);
  private readonly pythonServiceUrl: string;

  constructor(
    private readonly icrService: IcrService,
    private readonly configService: ConfigService,
    private readonly templateAdminService: IcrTemplateAdminService,
    private readonly tagConfigService: IcrTagConfigService,
  ) {
    this.pythonServiceUrl = this.configService.get<string>(
      'PYTHON_REPORT_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  async exportToWord(reportId: number): Promise<Buffer> {
    const report = await this.icrService.findById(reportId);
    const payload = this.serializeForExport(report);

    try {
      const response = await axios.post(
        `${this.pythonServiceUrl}/export/icr`,
        { ...payload, format: 'WORD' },
        { responseType: 'arraybuffer', timeout: 30_000 },
      );
      return Buffer.from(response.data);
    } catch (error) {
      throw new InternalServerErrorException(
        'Word generation failed in Python service.',
      );
    }
  }

  async exportToPdf(reportId: number): Promise<Buffer> {
    const report = await this.icrService.findById(reportId);
    const payload = this.serializeForExport(report);

    try {
      const response = await axios.post(
        `${this.pythonServiceUrl}/export/icr`,
        { ...payload, format: 'PDF' },
        { responseType: 'arraybuffer', timeout: 30_000 },
      );
      return Buffer.from(response.data);
    } catch (error) {
      throw new InternalServerErrorException(
        'PDF generation failed in Python service.',
      );
    }
  }

  async exportFromTemplate(
    reportId: number,
    format: 'WORD' | 'PDF' = 'WORD',
  ): Promise<Buffer> {
    const report = await this.icrService.findById(reportId);
    const payload = this.buildTemplatePayload(report, format);

    try {
      const response = await axios.post(
        `${this.pythonServiceUrl}/export/icr/template`,
        payload,
        { responseType: 'arraybuffer', timeout: 60_000 },
      );
      return Buffer.from(response.data);
    } catch (error) {
      throw new InternalServerErrorException(
        'Template export failed in Python service.',
      );
    }
  }

  private buildTemplatePayload(
    report: IcrReportRecord,
    format: 'WORD' | 'PDF',
  ): TemplatePayload {
    const snap = (report.reportSnapshot ?? {}) as Record<string, unknown>;
    const periodTo = new Date(report.periodTo);

    return {
      report_year: periodTo.getFullYear(),
      report_month: periodTo.getMonth() + 1,
      net_profit: (snap['netProfit'] as number) ?? 0,
      profit_growth_pct: (snap['profitGrowthPct'] as number) ?? 0,
      staff_count: (snap['staffCount'] as number) ?? 0,
      branch_count: (snap['branchCount'] as number) ?? 0,
      loan_deposit_ratio: (snap['loanDepositRatio'] as number) ?? 0,
      overall_rating: report.overallRating ?? 'SATISFACTORY',
      findings: this.buildFindingsRows(report),
      format,
    };
  }

  private buildFindingsRows(report: IcrReportRecord): FindingRow[] {
    const snap = (report.reportSnapshot ?? {}) as Record<string, unknown>;
    const findingStats = snap['findingStats'] as Record<string, unknown>[] | undefined;

    if (findingStats?.length) {
      return findingStats.map((f) => ({
        activity: String(f['activity'] ?? ''),
        component: String(f['component'] ?? ''),
        high: Number(f['high'] ?? 0),
        medium: Number(f['medium'] ?? 0),
        low: Number(f['low'] ?? 0),
      }));
    }

    return [
      { activity: 'حوكمة المصرف', component: 'CONTROL_ENVIRONMENT', high: 0, medium: 0, low: 0 },
      { activity: 'الائتمان للشركات والأفراد', component: 'RISK_ASSESSMENT', high: 0, medium: 0, low: 0 },
      { activity: 'خدمات التجزئة المصرفية', component: 'CONTROL_ACTIVITIES', high: 0, medium: 0, low: 0 },
      { activity: 'الخزانة ومخاطر السوق', component: 'INFORMATION_COMMUNICATION', high: 0, medium: 0, low: 0 },
      { activity: 'مخاطر التشغيل والسيولة', component: 'MONITORING', high: 0, medium: 0, low: 0 },
    ];
  }

  async exportFromTaggedTemplate(
    reportId: number,
    format: 'WORD' | 'PDF' = 'WORD',
    templateId?: number,
  ): Promise<Buffer> {
    const report = await this.icrService.findById(reportId);

    let filePath: string | null = null;

    if (templateId) {
      const tpl = await this.templateAdminService.getTemplate(templateId);
      filePath = tpl.filePath;
    } else if (report.templateId) {
      const tpl = await this.templateAdminService.getTemplate(report.templateId);
      filePath = tpl.filePath;
    } else {
      const defaultTpl = await this.templateAdminService.getDefaultTemplate();
      filePath = defaultTpl?.filePath ?? null;
    }

    if (!filePath) {
      throw new NotFoundException(
        'No tagged template file available. Upload a .docx template in Admin first.',
      );
    }

    const tagConfigsMap = await this.loadAllTagConfigs(report);
    const payload = this.buildTaggedPayload(report, filePath, format, tagConfigsMap);

    try {
      const response = await axios.post(
        `${this.pythonServiceUrl}/export/icr/tagged`,
        payload,
        { responseType: 'arraybuffer', timeout: 60_000 },
      );
      return Buffer.from(response.data);
    } catch (error: any) {
      const detail = error?.response?.data
        ? Buffer.from(error.response.data).toString('utf-8').slice(0, 500)
        : error.message;
      throw new InternalServerErrorException(
        `Tagged template export failed: ${detail}`,
      );
    }
  }

  private buildTaggedPayload(
    report: IcrReportRecord,
    templatePath: string,
    format: 'WORD' | 'PDF',
    tagConfigsMap?: Record<string, any[]>,
  ): Record<string, unknown> {
    const periodTo = new Date(report.periodTo);
    const snap = (report.reportSnapshot ?? {}) as Record<string, unknown>;

    return {
      templatePath,
      format,
      id: report.id,
      title: report.title,
      reportingPeriod: report.reportingPeriod,
      reportYear: periodTo.getFullYear(),
      reportMonth: periodTo.getMonth() + 1,
      framework: report.framework,
      businessUnit: report.businessUnit,
      status: report.status,
      overallRating: report.overallRating ?? 'SATISFACTORY',
      preparedBy: report.approvalChain?.preparedBy ?? null,
      reviewedBy: report.approvalChain?.reviewedBy ?? null,
      approvedBy: report.approvalChain?.approvedBy ?? null,
      approvalChain: report.approvalChain,
      netProfit: (snap['netProfit'] as number) ?? 0,
      profitGrowthPct: (snap['profitGrowthPct'] as number) ?? 0,
      staffCount: (snap['staffCount'] as number) ?? 0,
      branchCount: (snap['branchCount'] as number) ?? 0,
      loanDepositRatio: (snap['loanDepositRatio'] as number) ?? 0,
      reportSnapshot: snap,
      sections: report.sections
        ?.filter((s) => s.isVisible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          type: s.sectionType,
          sectionType: s.sectionType,
          title: s.title,
          content: s.content,
          tagConfigs: tagConfigsMap?.[s.sectionType] ?? [],
        })),
    };
  }

  private async loadAllTagConfigs(
    report: IcrReportRecord,
  ): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    const sections = report.sections?.filter((s) => s.isVisible) ?? [];

    for (const sec of sections) {
      try {
        const configs = await this.tagConfigService.getTagConfigsForExport(
          report.id,
          sec.sectionType,
        );
        if (configs.length) {
          result[sec.sectionType] = configs.map((c) => ({
            tagKey: c.tagKey,
            sourceType: c.sourceType,
            dataType: c.dataType,
            userValue: c.userValue,
            dbTable: c.dbTable,
            dbColumns: c.dbColumns,
            dbData: c.dbData,
            chartId: c.chartId,
            useChart: c.useChart,
            useTable: c.useTable,
            chartType: c.chartType,
            chartTitle: c.chartTitle,
            chartData: c.chartData,
          }));
        }
      } catch {
        /* section may not have configs */
      }
    }

    return result;
  }

  private serializeForExport(report: IcrReportRecord): Record<string, unknown> {
    return {
      id: report.id,
      title: report.title,
      reportingPeriod: report.reportingPeriod,
      framework: report.framework,
      businessUnit: report.businessUnit,
      preparedBy: report.approvalChain?.preparedBy ?? null,
      reviewedBy: report.approvalChain?.reviewedBy ?? null,
      approvedBy: report.approvalChain?.approvedBy ?? null,
      status: report.status,
      overallRating: report.overallRating,
      approvalChain: report.approvalChain,
      sections: report.sections
        ?.filter((s) => s.isVisible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          type: s.sectionType,
          title: s.title,
          content: s.content,
        })),
    };
  }
}
