import { Controller, Get, Query } from '@nestjs/common';
import { GrcComplyService, GrcComplyReportKey } from './grc-comply.service';

@Controller('api/grc/comply')
export class GrcComplyController {
  constructor(private readonly grcComplyService: GrcComplyService) {}

  /**
   * Single endpoint for one GRC compliance SQL report (1–26).
   *
   * Usage examples:
   *   GET /api/grc/comply?report=1
   *   GET /api/grc/comply?report=26
   */
  @Get()
  async getReport(@Query('report') report: string) {
    const reportKey = report as GrcComplyReportKey;
    return this.grcComplyService.runReport(reportKey);
  }

  /**
   * Fetch all 26 reports in one call.
   *
   * Each key in the response is the descriptive name of the query.
   *
   * Usage:
   *   GET /api/grc/comply/all
   */
  @Get('all')
  async getAllReports() {
    return this.grcComplyService.runAllReports();
  }
}


