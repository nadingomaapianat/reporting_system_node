import {
  Controller, Post, Get, Patch, Delete, Query,
  Param, Body, UseInterceptors,
  UploadedFile, Logger, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IcrTemplateAdminService } from './services/icr-template-admin.service';
import { IcrGuard, IcrRole } from './guards/icr.guards';
import { CurrentUser, IcrReportUser } from './decorators/current-user.decorator';

/** In-memory file from `FileInterceptor` (multer); avoids relying on `Express.Multer` typings. */
type MemoryUploadedFile = {
  buffer: Buffer;
  originalname: string;
  size: number;
};

@Controller('api/icr/admin')
export class IcrTemplateAdminController {
  private readonly logger = new Logger(IcrTemplateAdminController.name);

  constructor(private readonly adminService: IcrTemplateAdminService) {}

  // ═══════════════════════════════════════════════════════════════════
  // Template CRUD
  // ═══════════════════════════════════════════════════════════════════

  @Get('templates')
  @HttpCode(HttpStatus.OK)
  @IcrGuard(IcrRole.ADMIN, IcrRole.VIEWER, IcrRole.PREPARER, IcrRole.REVIEWER, IcrRole.APPROVER)
  getTemplates() {
    return this.adminService.getTemplates();
  }

  @Get('templates/default')
  @HttpCode(HttpStatus.OK)
  @IcrGuard(IcrRole.ADMIN, IcrRole.VIEWER)
  getDefaultTemplate() {
    return this.adminService.getDefaultTemplate();
  }

  @Get('templates/:id')
  @HttpCode(HttpStatus.OK)
  @IcrGuard(IcrRole.ADMIN, IcrRole.VIEWER)
  getTemplate(@Param('id') id: string) {
    return this.adminService.getTemplate(Number(id));
  }

  @Post('templates/:id/set-default')
  @HttpCode(HttpStatus.OK)
  @IcrGuard(IcrRole.ADMIN)
  setDefaultTemplate(@Param('id') id: string) {
    return this.adminService.setDefaultTemplate(Number(id));
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @IcrGuard(IcrRole.ADMIN)
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
  @IcrGuard(IcrRole.ADMIN)
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
  @IcrGuard(IcrRole.ADMIN)
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
  @IcrGuard(IcrRole.ADMIN)
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
  @IcrGuard(IcrRole.ADMIN, IcrRole.VIEWER, IcrRole.PREPARER, IcrRole.REVIEWER, IcrRole.APPROVER)
  getConfigs(@Query('templateId') templateId?: string) {
    return this.adminService.getConfigs(templateId ? Number(templateId) : undefined);
  }

  @Patch('section-configs/:sectionType')
  @HttpCode(HttpStatus.OK)
  @IcrGuard(IcrRole.ADMIN)
  updateConfig(
    @Param('sectionType') sectionType: string,
    @Body() patch: any,
  ) {
    return this.adminService.updateConfig(sectionType, patch, patch.templateId);
  }

  @Delete('section-configs/:sectionType')
  @HttpCode(HttpStatus.NO_CONTENT)
  @IcrGuard(IcrRole.ADMIN)
  deleteConfig(
    @Param('sectionType') sectionType: string,
    @Query('templateId') templateId?: string,
  ) {
    return this.adminService.deleteConfig(sectionType, templateId ? Number(templateId) : undefined);
  }

  @Post('seed-defaults')
  @HttpCode(HttpStatus.OK)
  @IcrGuard(IcrRole.ADMIN)
  seedDefaults() {
    return this.adminService.seedFromDefaults();
  }
}
