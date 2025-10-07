import { Injectable } from '@nestjs/common';
import { BaseDashboardService, DashboardConfig } from '../shared/base-dashboard.service';
import { DashboardConfigService } from '../shared/dashboard-config.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class GrcDashboardService extends BaseDashboardService {
  constructor(databaseService: DatabaseService) {
    super(databaseService);
  }

  getConfig(): DashboardConfig {
    return DashboardConfigService.getControlsConfig();
  }

  // Override specific methods if needed for custom logic
  async getControlsDashboard(startDate?: string, endDate?: string) {
    return this.getDashboardData(startDate, endDate);
  }

  // Individual card data methods (for modals)
  async getTotalControls(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    return this.getCardData('total', page, limit, startDate, endDate);
  }

  async getUnmappedControls(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    return this.getCardData('unmapped', page, limit, startDate, endDate);
  }

  async getPendingPreparerControls(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    return this.getCardData('pendingPreparer', page, limit, startDate, endDate);
  }

  async getPendingCheckerControls(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    return this.getCardData('pendingChecker', page, limit, startDate, endDate);
  }

  async getPendingReviewerControls(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    return this.getCardData('pendingReviewer', page, limit, startDate, endDate);
  }

  async getPendingAcceptanceControls(page: number = 1, limit: number = 10, startDate?: string, endDate?: string) {
    return this.getCardData('pendingAcceptance', page, limit, startDate, endDate);
  }
}
