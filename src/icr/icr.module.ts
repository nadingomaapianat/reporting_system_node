import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { IcrController } from './icr.controller';
import { IcrTemplateAdminController } from './icr-template-admin.controller';
import { IcrService } from './services/icr.service';
import { IcrDataAggregatorService } from './services/icr-data-aggregator.service';
import { IcrTemplateEngineService } from './services/icr-template-engine.service';
import { IcrExportService } from './services/icr-export.service';
import { IcrWorkflowService } from './services/icr-workflow.service';
import { IcrTemplateAdminService } from './services/icr-template-admin.service';
import { IcrNotificationService } from './services/icr-notification.service';
import { IcrTagConfigService } from './services/icr-tag-config.service';
import { IcrRequestHydrateInterceptor } from './icr-user-context';
import { ParseSectionTypePipe } from './pipes/parse-section-type.pipe';
import { IcrExceptionFilter } from './filters/icr-exception.filter';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [IcrController, IcrTemplateAdminController],
  providers: [
    IcrService,
    IcrDataAggregatorService,
    IcrTemplateEngineService,
    IcrExportService,
    IcrWorkflowService,
    IcrTemplateAdminService,
    IcrNotificationService,
    IcrTagConfigService,
    IcrRequestHydrateInterceptor,
    ParseSectionTypePipe,
    { provide: APP_FILTER, useClass: IcrExceptionFilter },
  ],
  exports: [IcrService],
})
export class IcrModule {}
