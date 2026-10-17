import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { UserFunctionAccess, UserFunctionAccessService } from '../shared/user-function-access.service';
import { IcrService } from './services/icr.service';
import {
  CreateIcrReportDto,
  UpdateIcrStatusDto,
  UpdateSectionNotesDto,
  UpdateSectionOwnerDto,
  UpdateSectionContentDto,
  UpdateSectionDefaultDto,
  WorkflowActionDto,
  ListIcrReportsQueryDto,
} from './dto/icr.dto';
import { IcrRequestHydrateInterceptor } from './icr-user-context';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { ParseSectionTypePipe } from './pipes/parse-section-type.pipe';
import { IcrSectionType } from './interfaces/icr-section.types';
import { IcrExportService } from './services/icr-export.service';
import { IcrWorkflowService } from './services/icr-workflow.service';
import { IcrNotificationService } from './services/icr-notification.service';
import { IcrTemplateAdminService } from './services/icr-template-admin.service';
import { IcrTagConfigService, SaveTagConfigItem } from './services/icr-tag-config.service';

export interface IcrReportUser {
  id: string;
  fullName: string;
  email: string;
}

@Controller('api/icr')
@Permissions('ICR Reports', ['show'])
@UseGuards(PermissionsGuard)
@UseInterceptors(IcrRequestHydrateInterceptor)
export class IcrController {
  private readonly logger = new Logger(IcrController.name);

  constructor(
    private readonly icrService: IcrService,
    private readonly exportService: IcrExportService,
    private readonly workflowService: IcrWorkflowService,
    private readonly notificationService: IcrNotificationService,
    private readonly templateAdminService: IcrTemplateAdminService,
    private readonly tagConfigService: IcrTagConfigService,
    private readonly userFunctionAccess: UserFunctionAccessService,
  ) {}

  /** The viewer's functions: live ICR data (tag tables, tagged export) is limited to them. */
  private accessFor(user: IcrReportUser): Promise<UserFunctionAccess> {
    return this.userFunctionAccess.getUserFunctionAccess(user as unknown as { id: string; groupName?: string });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async createReport(
    @Body() dto: CreateIcrReportDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[POST /api/icr] user=${user.id} title="${dto.title}"`);
    return this.icrService.createReport(dto, user);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: ListIcrReportsQueryDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[GET /api/icr] user=${user.id}`);
    return this.icrService.findAll(query);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Notifications (static paths must come before :id)
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════
  // Templates (static paths must come before :id)
  // ═══════════════════════════════════════════════════════════════════

  @Get('templates')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Templates', ['show'])
  getTemplates() {
    return this.templateAdminService.getTemplates();
  }

  // ═══════════════════════════════════════════════════════════════════
  // Tag Config — column metadata (static path must come before :id)
  // ═══════════════════════════════════════════════════════════════════

  @Get('tag-meta/columns/:tableName')
  @HttpCode(HttpStatus.OK)
  async getTableColumns(@Param('tableName') tableName: string) {
    return this.tagConfigService.getAvailableColumns(tableName);
  }

  @Get('tag-meta/charts')
  @HttpCode(HttpStatus.OK)
  async getDynamicCharts() {
    return this.tagConfigService.listAvailableCharts();
  }

  @Get('tasks/my')
  @HttpCode(HttpStatus.OK)
  @Permissions('Tasks', ['show'])
  async getMyTaskReports(@Req() req: any, @Query('templateId') templateId?: string) {
    const tid =
      templateId != null && String(templateId).trim() !== ''
        ? Number.parseInt(String(templateId), 10)
        : undefined;
    if (tid != null && (Number.isNaN(tid) || tid < 1)) {
      throw new BadRequestException('templateId must be a positive integer.');
    }
    return this.icrService.getMyTaskReports(req.user, tid);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Report by ID (dynamic :id must come after all static paths)
  // ═══════════════════════════════════════════════════════════════════

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[GET /api/icr/${id}] user=${user.id}`);
    return this.icrService.findById(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIcrStatusDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[PATCH /api/icr/${id}/status] user=${user.id} → ${dto.status}`);
    return this.icrService.updateStatus(id, dto, user, dto.version);
  }

  @Post(':id/regenerate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async regenerate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[POST /api/icr/${id}/regenerate] user=${user.id}`);
    return this.icrService.regenerate(id, user);
  }

  @Get(':id/sections/:sectionType')
  @HttpCode(HttpStatus.OK)
  async findSection(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[GET /api/icr/${id}/sections/${sectionType}] user=${user.id}`);
    return this.icrService.findSection(id, sectionType);
  }

  @Post(':id/sections/:sectionType/regenerate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async regenerateSection(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[POST /api/icr/${id}/sections/${sectionType}/regenerate] user=${user.id}`);
    return this.icrService.regenerateSection(id, { sectionType }, user);
  }

  @Patch(':id/sections/:sectionType/notes')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async updateSectionNotes(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @Body() dto: UpdateSectionNotesDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[PATCH /api/icr/${id}/sections/${sectionType}/notes] user=${user.id}`);
    return this.icrService.updateSectionNotes(id, sectionType, dto.notes, user);
  }

  @Patch(':id/sections/:sectionType/content')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async updateSectionContent(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @Body() dto: UpdateSectionContentDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[PATCH /api/icr/${id}/sections/${sectionType}/content] user=${user.id}`);
    return this.icrService.updateSectionContent(id, sectionType, dto.content, user);
  }

  // ── Tag Configs per section (accepts custom template section types) ──

  @Get(':id/sections/:sectionType/tag-configs')
  @HttpCode(HttpStatus.OK)
  async getTagConfigs(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType') sectionType: string,
  ) {
    return this.tagConfigService.getTagConfigs(id, sectionType);
  }

  @Patch(':id/sections/:sectionType/tag-configs')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async saveTagConfigs(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType') sectionType: string,
    @Body() body: { configs: SaveTagConfigItem[] },
  ) {
    return this.tagConfigService.saveTagConfigs(id, sectionType, body.configs);
  }

  @Get(':id/sections/:sectionType/tag-data/:tableName')
  @HttpCode(HttpStatus.OK)
  async getTagTableData(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType') sectionType: string,
    @Param('tableName') tableName: string,
    @Query('columns') columnsStr: string,
    @CurrentUser() user: IcrReportUser,
  ) {
    const columns = columnsStr ? columnsStr.split(',').map(c => c.trim()).filter(Boolean) : [];
    return this.tagConfigService.fetchTableDataForPreview(id, tableName, columns, await this.accessFor(user));
  }

  @Get(':id/sections/:sectionType/tag-chart/:chartId')
  @HttpCode(HttpStatus.OK)
  async getTagChartData(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType') sectionType: string,
    @Param('chartId', ParseIntPipe) chartId: number,
    @Query('useChart') useChart: string,
    @Query('useTable') useTable: string,
  ) {
    return this.tagConfigService.fetchChartDataForPreview(
      id,
      chartId,
      useChart === 'true',
      useTable === 'true',
    );
  }

  @Patch(':id/sections/:sectionType/owner')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async updateSectionOwner(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @Body() dto: UpdateSectionOwnerDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[PATCH /api/icr/${id}/sections/${sectionType}/owner] user=${user.id} → ${dto.sectionOwner}`);
    return this.icrService.updateSectionOwner(id, sectionType, dto.sectionOwner, dto.sectionOwnerInitials, user, dto.makerFunction, dto.checkerFunction);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('ICR Reports', ['delete'])
  async deleteReport(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[DELETE /api/icr/${id}] user=${user.id}`);
    await this.icrService.deleteReport(id, user);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION WORKFLOW — MAKER ACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  @Post(':id/sections/:sectionType/submit')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create'], true)
  async submitSection(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @Body() dto: WorkflowActionDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[POST /api/icr/${id}/sections/${sectionType}/submit] user=${user.id}`);
    return this.workflowService.submitForReview(id, sectionType, user, dto.notes);
  }

  @Post(':id/sections/:sectionType/recall')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create'], true)
  async recallSection(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @Body() dto: WorkflowActionDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[POST /api/icr/${id}/sections/${sectionType}/recall] user=${user.id}`);
    return this.workflowService.recallSection(id, sectionType, user, dto.notes);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION WORKFLOW — CHECKER ACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  @Post(':id/sections/:sectionType/begin-review')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async beginSectionReview(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[POST /api/icr/${id}/sections/${sectionType}/begin-review] user=${user.id}`);
    return this.workflowService.beginReview(id, sectionType, user);
  }

  @Post(':id/sections/:sectionType/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions('Tasks', ['Reviewe', 'First Approval', 'Second Approval'], false)
  async approveSection(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @Body() dto: WorkflowActionDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[POST /api/icr/${id}/sections/${sectionType}/approve] user=${user.id}`);
    return this.workflowService.approveSection(id, sectionType, user, dto.notes);
  }

  @Post(':id/sections/:sectionType/reject')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create', 'edit'], true)
  async rejectSection(
    @Param('id', ParseIntPipe) id: number,
    @Param('sectionType', ParseSectionTypePipe) sectionType: IcrSectionType,
    @Body() dto: WorkflowActionDto,
    @CurrentUser() user: IcrReportUser,
  ) {
    this.logger.log(`[POST /api/icr/${id}/sections/${sectionType}/reject] user=${user.id}`);
    return this.workflowService.rejectSection(id, sectionType, user, dto.reason ?? '');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════════════════

  @Get(':id/export/tagged/:format')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Reports', ['create'], true)
  async exportFromTaggedTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Param('format') format: string,
    @Query('templateId') templateId: string | undefined,
    @CurrentUser() user: IcrReportUser,
    @Res() res: Response,
  ) {
    this.logger.log(`[GET /api/icr/${id}/export/tagged/${format}] user=${user.id}`);
    const fmt = format.toUpperCase() as 'WORD' | 'PDF';
    const buffer = await this.exportService.exportFromTaggedTemplate(
      id,
      fmt,
      templateId ? Number(templateId) : undefined,
      await this.accessFor(user),
    );
    const ext = fmt === 'PDF' ? 'pdf' : 'docx';
    const mime = fmt === 'PDF'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    res.set({
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="UnitedBank_ICR_Tagged_${id}.${ext}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.end(buffer);
  }

}
