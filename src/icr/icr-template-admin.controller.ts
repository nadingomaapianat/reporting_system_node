import {
  Controller, Post, Get, Patch, Delete, Query,
  Param, Body, UseInterceptors, UseGuards,
  UploadedFile, Logger, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IcrTemplateAdminService } from './services/icr-template-admin.service';
import { IcrRequestHydrateInterceptor } from './icr-user-context';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser, IcrReportUser } from './decorators/current-user.decorator';

/** In-memory file from `FileInterceptor` (multer); avoids relying on `Express.Multer` typings. */
type MemoryUploadedFile = {
  buffer: Buffer;
  originalname: string;
  size: number;
};

@Controller('api/icr/admin')
@Permissions('ICR Templates', ['show'])
@UseGuards(PermissionsGuard)
@UseInterceptors(IcrRequestHydrateInterceptor)
export class IcrTemplateAdminController {
  private readonly logger = new Logger(IcrTemplateAdminController.name);

  constructor(private readonly adminService: IcrTemplateAdminService) {}

  // ═══════════════════════════════════════════════════════════════════
  // Template CRUD
  // ═══════════════════════════════════════════════════════════════════

  @Get('templates')
  @HttpCode(HttpStatus.OK)
  getTemplates() {
    return this.adminService.getTemplates();
  }

  @Get('templates/default')
  @HttpCode(HttpStatus.OK)
  getDefaultTemplate() {
    return this.adminService.getDefaultTemplate();
  }

  @Get('templates/:id')
  @HttpCode(HttpStatus.OK)
  getTemplate(@Param('id') id: string) {
    return this.adminService.getTemplate(Number(id));
  }

  @Post('templates/:id/set-default')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Templates', ['create', 'edit'], true)
  setDefaultTemplate(@Param('id') id: string) {
    return this.adminService.setDefaultTemplate(Number(id));
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('ICR Templates', ['delete'], true)
  deleteTemplate(@Param('id') id: string) {
    return this.adminService.deleteTemplate(Number(id));
  }

  // ═══════════════════════════════════════════════════════════════════
  // Parse + Upload
  // ═══════════════════════════════════════════════════════════════════

  @Post('parse-template')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.originalname.endsWith('.docx')) {
        return cb(new Error('Only .docx files are accepted.'), false);
      }
      cb(null, true);
    },
  }))
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Templates', ['create', 'edit'], true)
  async parseTemplate(@UploadedFile() file: MemoryUploadedFile) {
    this.logger.log(`Parsing template: ${file.originalname} (${file.size} bytes)`);

    const parsed = await this.adminService.parseTemplate(file.buffer, file.originalname);
    const preview = this.adminService.previewSections(parsed);

    return {
      filename: file.originalname,
      filesize: file.size,
      savedFilePath: parsed.savedFilePath ?? null,
      parsed,
      preview,
    };
  }

  @Post('save-template')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('ICR Templates', ['create', 'edit'], true)
  async saveTemplate(
    @Body() body: {
      templateName: string;
      filename: string;
      sections: any[];
      description?: string;
      filePath?: string;
    },
    @CurrentUser() user: IcrReportUser,
  ) {
    const tpl = await this.adminService.createTemplate(
      body.templateName || body.filename,
      body.description ?? null,
      body.filename,
      user.fullName,
      user.id,
      body.filePath ?? null,
    );

    const saved = await this.adminService.saveConfigs(tpl.id, body.sections, body.filename);

    return {
      template: tpl,
      saved: saved.length,
      message: `Template "${tpl.name}" created with ${saved.length} section configs.`,
    };
  }

  @Post('templates/:id/update-sections')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Templates', ['create', 'edit'], true)
  async updateTemplateSections(
    @Param('id') id: string,
    @Body() body: {
      filename: string;
      sections: any[];
      filePath?: string;
    },
    @CurrentUser() user: IcrReportUser,
  ) {
    const templateId = Number(id);
    const tpl = await this.adminService.getTemplate(templateId);

    await this.adminService.clearConfigs(templateId);
    const saved = await this.adminService.saveConfigs(templateId, body.sections, body.filename);

    if (body.filePath) {
      await this.adminService.updateTemplateFile(templateId, body.filename, body.filePath);
    }

    return {
      template: { ...tpl, sourceFilename: body.filename },
      saved: saved.length,
      message: `Template "${tpl.name}" updated with ${saved.length} section configs.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Section Configs
  // ═══════════════════════════════════════════════════════════════════

  @Get('section-configs')
  @HttpCode(HttpStatus.OK)
  getConfigs(@Query('templateId') templateId?: string) {
    return this.adminService.getConfigs(templateId ? Number(templateId) : undefined);
  }

  @Patch('section-configs/:sectionType')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Templates', ['create', 'edit'], true)
  updateConfig(
    @Param('sectionType') sectionType: string,
    @Body() patch: any,
  ) {
    return this.adminService.updateConfig(sectionType, patch, patch.templateId);
  }

  @Delete('section-configs/:sectionType')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('ICR Templates', ['create', 'edit'], true)
  deleteConfig(
    @Param('sectionType') sectionType: string,
    @Query('templateId') templateId?: string,
  ) {
    return this.adminService.deleteConfig(sectionType, templateId ? Number(templateId) : undefined);
  }

  @Post('seed-defaults')
  @HttpCode(HttpStatus.OK)
  @Permissions('ICR Templates', ['create', 'edit'], true)
  seedDefaults() {
    return this.adminService.seedFromDefaults();
  }
}
