import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';
import * as sql from 'mssql';
import { DatabaseService } from '../../database/database.service';
import {
  IcrSectionType,
  IcrContentType,
  SECTION_OWNERSHIP_MAP,
  SECTION_CONTENT_TYPE_MAP,
  DEFAULT_SECTION_OWNERS,
} from '../interfaces/icr-section.types';
import { ICR_SECTION_EDITABLE_KEYS } from '../constants/icr-section-editable';

export interface ParsedSection {
  key: string;
  title_ar: string;
  title_en: string;
  heading_style: string;
  para_index: number;
  sort_order: number;
  content_type_suggestion: string;
  placeholders: string[];
  tables: object[];
  paragraph_count: number;
  paragraphs: string[];
}

export interface ParsedTemplate {
  sections: ParsedSection[];
  total_paragraphs: number;
  total_tables: number;
  all_placeholders: string[];
  savedFilePath?: string;
}

export interface IcrTemplate {
  id: number;
  name: string;
  description: string | null;
  sourceFilename: string | null;
  filePath: string | null;
  isDefault: boolean;
  isActive: boolean;
  sectionCount?: number;
  tagCount?: number;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SectionConfigRow {
  id?: number;
  templateId?: number;
  sectionType: string;
  titleAr: string;
  titleEn: string;
  sortOrder: number;
  paraIndex: number | null;
  contentType: string;
  isEnabled: boolean;
  ownership: Record<string, string> | null;
  editableFields: object[];
  tables: object[];
  placeholders: string[];
  rawContent: { paragraphs: string[]; tables: object[] } | null;
  sourceFilename: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function parseJsonCol<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw as T;
  try {
    return JSON.parse(raw as string) as T;
  } catch {
    return fallback;
  }
}

function toSectionKey(title: string, index: number): string {
  const cleaned = String(title ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return cleaned || `SECTION_${index + 1}`;
}

function extractPlaceholders(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{[^}]+\}\}/g) ?? [];
  return Array.from(new Set(matches));
}

function mapConfigRow(row: any): SectionConfigRow {
  return {
    id: row.id,
    templateId: row.templateId,
    sectionType: row.sectionType,
    titleAr: row.titleAr,
    titleEn: row.titleEn ?? '',
    sortOrder: row.sortOrder ?? 99,
    paraIndex: row.paraIndex ?? null,
    contentType: row.contentType ?? 'LOCKED',
    isEnabled: row.isEnabled === true || row.isEnabled === 1,
    ownership: parseJsonCol(row.ownership, null),
    editableFields: parseJsonCol(row.editableFields, []),
    tables: parseJsonCol(row.tables, []),
    placeholders: parseJsonCol(row.placeholders, []),
    rawContent: parseJsonCol(row.rawContent, null),
    sourceFilename: row.sourceFilename ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

function mapTemplateRow(row: any): IcrTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    sourceFilename: row.sourceFilename ?? null,
    filePath: row.filePath ?? null,
    isDefault: row.isDefault === true || row.isDefault === 1,
    isActive: row.isActive === true || row.isActive === 1,
    sectionCount: row.sectionCount ?? undefined,
    tagCount: row.tagCount ?? undefined,
    createdByName: row.resolvedCreatorName ?? row.createdByName ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : '',
  };
}

@Injectable()
export class IcrTemplateAdminService {
  private readonly logger = new Logger(IcrTemplateAdminService.name);
  private readonly pythonUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.pythonUrl = this.configService.get<string>(
      'PYTHON_REPORT_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Template CRUD
  // ═══════════════════════════════════════════════════════════════════

  async createTemplate(
    name: string,
    description: string | null,
    sourceFilename: string | null,
    userName: string | null,
    userId: string | null,
    filePath?: string | null,
  ): Promise<IcrTemplate> {
    const rows = await this.db.query(
      `INSERT INTO dbo.icr_templates (name, description, sourceFilename, filePath, isDefault, isActive, createdByName, createdById, createdAt, updatedAt)
       OUTPUT INSERTED.*
       VALUES (@param0, @param1, @param2, @param3, 0, 1, @param4, @param5, GETUTCDATE(), GETUTCDATE())`,
      [name, description, sourceFilename, filePath ?? null, userName, userId],
    );
    return mapTemplateRow(rows[0]);
  }

  async getTemplates(): Promise<IcrTemplate[]> {
    const rows = await this.db.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM dbo.icr_section_configs c WHERE c.templateId = t.id) AS sectionCount,
              (SELECT ISNULL(SUM(pj.cnt), 0) FROM dbo.icr_section_configs c2
               CROSS APPLY (SELECT COUNT(*) AS cnt FROM OPENJSON(ISNULL(c2.placeholders, '[]'))) pj
               WHERE c2.templateId = t.id) AS tagCount,
              COALESCE(u.name, u.username) AS resolvedCreatorName
       FROM dbo.icr_templates t
       LEFT JOIN dbo.Users u ON t.createdById = CAST(u.id AS NVARCHAR(200))
       WHERE t.isActive = 1
       ORDER BY t.isDefault DESC, t.createdAt DESC`,
      [],
    );
    return (rows ?? []).map(mapTemplateRow);
  }

  async getTemplate(id: number): Promise<IcrTemplate> {
    const rows = await this.db.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM dbo.icr_section_configs c WHERE c.templateId = t.id) AS sectionCount,
              (SELECT ISNULL(SUM(pj.cnt), 0) FROM dbo.icr_section_configs c2
               CROSS APPLY (SELECT COUNT(*) AS cnt FROM OPENJSON(ISNULL(c2.placeholders, '[]'))) pj
               WHERE c2.templateId = t.id) AS tagCount,
              COALESCE(u.name, u.username) AS resolvedCreatorName
       FROM dbo.icr_templates t
       LEFT JOIN dbo.Users u ON t.createdById = CAST(u.id AS NVARCHAR(200))
       WHERE t.id = @param0`,
      [id],
    );
    if (!rows?.length) throw new NotFoundException(`Template ${id} not found.`);
    return mapTemplateRow(rows[0]);
  }

  async getDefaultTemplate(): Promise<IcrTemplate | null> {
    const rows = await this.db.query(
      `SELECT TOP 1 t.*,
              (SELECT COUNT(*) FROM dbo.icr_section_configs c WHERE c.templateId = t.id) AS sectionCount,
              (SELECT ISNULL(SUM(pj.cnt), 0) FROM dbo.icr_section_configs c2
               CROSS APPLY (SELECT COUNT(*) AS cnt FROM OPENJSON(ISNULL(c2.placeholders, '[]'))) pj
               WHERE c2.templateId = t.id) AS tagCount,
              COALESCE(u.name, u.username) AS resolvedCreatorName
       FROM dbo.icr_templates t
       LEFT JOIN dbo.Users u ON t.createdById = CAST(u.id AS NVARCHAR(200))
       WHERE t.isDefault = 1 AND t.isActive = 1`,
      [],
    );
    return rows?.length ? mapTemplateRow(rows[0]) : null;
  }

  async setDefaultTemplate(templateId: number): Promise<IcrTemplate> {
    await this.db.query(`UPDATE dbo.icr_templates SET isDefault = 0`, []);
    await this.db.query(
      `UPDATE dbo.icr_templates SET isDefault = 1, updatedAt = GETUTCDATE() WHERE id = @param0`,
      [templateId],
    );
    return this.getTemplate(templateId);
  }

  async deleteTemplate(templateId: number): Promise<void> {
    await this.db.query(
      `UPDATE dbo.icr_templates SET isActive = 0, updatedAt = GETUTCDATE() WHERE id = @param0`,
      [templateId],
    );
  }

  async clearConfigs(templateId: number): Promise<void> {
    await this.db.query(
      `DELETE FROM dbo.icr_section_configs WHERE templateId = @param0`,
      [templateId],
    );
    this.logger.log(`Cleared section configs for template ${templateId}`);
  }

  async updateTemplateFile(templateId: number, filename: string, filePath: string): Promise<void> {
    await this.db.query(
      `UPDATE dbo.icr_templates
       SET sourceFilename = @param0, filePath = @param1, updatedAt = GETUTCDATE()
       WHERE id = @param2`,
      [filename, filePath, templateId],
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Template Parsing (calls Python)
  // ═══════════════════════════════════════════════════════════════════

  async parseTemplate(
    fileBuffer: Buffer,
    filename: string,
  ): Promise<ParsedTemplate> {
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    try {
      const { data } = await axios.post<any>(
        `${this.pythonUrl}/parse-template`,
        form,
        { headers: form.getHeaders(), timeout: 30_000 },
      );
      return this.normalizeParsedTemplate(data);
    } catch (err) {
      this.logger.error('Template parsing failed', err);
      throw new InternalServerErrorException(
        'Failed to parse template. Is the Python service running?',
      );
    }
  }

  private normalizeParsedTemplate(raw: any): ParsedTemplate {
    // Preferred Python parser payload (already in expected schema).
    if (raw && Array.isArray(raw.sections) && raw.sections.every((s: any) => typeof s === 'object' && s)) {
      const looksLikePreferred = raw.sections.some((s: any) => 'key' in s || 'title_ar' in s || 'sort_order' in s);
      if (looksLikePreferred) {
        return {
          sections: raw.sections.map((s: any, i: number) => ({
            key: String(s.key ?? toSectionKey(s.title_ar ?? s.title ?? `Section ${i + 1}`, i)),
            title_ar: String(s.title_ar ?? s.title ?? `Section ${i + 1}`),
            title_en: String(s.title_en ?? ''),
            heading_style: String(s.heading_style ?? ''),
            para_index: Number.isFinite(s.para_index) ? s.para_index : i + 1,
            sort_order: Number.isFinite(s.sort_order) ? s.sort_order : i + 1,
            content_type_suggestion: String(s.content_type_suggestion ?? 'EDITABLE'),
            placeholders: Array.isArray(s.placeholders) ? s.placeholders.map((p: unknown) => String(p)) : [],
            tables: Array.isArray(s.tables) ? s.tables : [],
            paragraph_count: Number.isFinite(s.paragraph_count) ? s.paragraph_count : 0,
            paragraphs: Array.isArray(s.paragraphs) ? s.paragraphs.map((p: unknown) => String(p)) : [],
          })),
          total_paragraphs: Number.isFinite(raw.total_paragraphs) ? raw.total_paragraphs : 0,
          total_tables: Number.isFinite(raw.total_tables) ? raw.total_tables : 0,
          all_placeholders: Array.isArray(raw.all_placeholders) ? raw.all_placeholders.map((p: unknown) => String(p)) : [],
          savedFilePath: raw.savedFilePath ?? undefined,
        };
      }

      // Legacy parser payload: { success, sections: [{id,title,content,type,order}], total_sections }.
      const sections: ParsedSection[] = raw.sections.map((s: any, i: number) => {
        const content = String(s.content ?? '');
        const placeholders = extractPlaceholders(content);
        const isTable = String(s.type ?? '').toLowerCase() === 'table';
        const order = Number.isFinite(s.order) ? s.order : i + 1;
        return {
          key: toSectionKey(s.title ?? s.id ?? `Section ${order}`, i),
          title_ar: String(s.title ?? `Section ${order}`),
          title_en: '',
          heading_style: '',
          para_index: order,
          sort_order: order,
          content_type_suggestion: isTable ? 'DYNAMIC' : 'EDITABLE',
          placeholders,
          tables: isTable ? [{ html: content }] : [],
          paragraph_count: content ? 1 : 0,
          paragraphs: content ? [content] : [],
        };
      });

      return {
        sections,
        total_paragraphs: sections.reduce((sum, s) => sum + s.paragraph_count, 0),
        total_tables: sections.reduce((sum, s) => sum + (s.tables?.length ?? 0), 0),
        all_placeholders: Array.from(
          new Set([
            ...sections.flatMap(s => s.placeholders),
            ...(Array.isArray(raw.all_placeholders)
              ? raw.all_placeholders.map((p: unknown) => String(p))
              : []),
          ]),
        ),
        savedFilePath: raw.savedFilePath ?? undefined,
      };
    }

    throw new InternalServerErrorException('Python parser returned an unexpected response format.');
  }

  previewSections(parsed: ParsedTemplate): SectionConfigRow[] {
    return parsed.sections.map(s => {
      const mergedPlaceholders = Array.from(
        new Set([
          ...(s.placeholders ?? []),
          ...extractPlaceholders(String(s.title_ar ?? '')),
          ...extractPlaceholders(String(s.title_en ?? '')),
          ...(Array.isArray(s.paragraphs)
            ? s.paragraphs.flatMap((p) => extractPlaceholders(String(p ?? '')))
            : []),
        ]),
      );
      const editableFields = mergedPlaceholders
        .filter(ph => ph.startsWith('{{'))
        .map(ph => {
          const key = ph.replace(/[{}%\s]/g, '');
          return { key, labelAr: key, labelEn: key.replace(/_/g, ' '), type: 'text' };
        });
      const suggestedCt = String(s.content_type_suggestion ?? '').toUpperCase();
      const resolvedCt =
        mergedPlaceholders.length > 0 && (suggestedCt === '' || suggestedCt === 'LOCKED' || suggestedCt === 'STATIC')
          ? 'EDITABLE'
          : (s.content_type_suggestion || 'EDITABLE');

      return {
        sectionType: s.key,
        titleAr: s.title_ar,
        titleEn: s.title_en || '',
        sortOrder: s.sort_order,
        paraIndex: s.para_index,
        contentType: resolvedCt,
        isEnabled: true,
        ownership: null,
        editableFields,
        tables: s.tables ?? [],
        placeholders: mergedPlaceholders,
        rawContent: null,
        sourceFilename: null,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Section Configs (per template)
  // ═══════════════════════════════════════════════════════════════════

  async saveConfigs(
    templateId: number,
    sections: SectionConfigRow[],
    filename: string,
  ): Promise<SectionConfigRow[]> {
    const pool = await this.db.getConnection();
    const results: SectionConfigRow[] = [];

    for (const sec of sections) {
      if (!sec.sectionType) continue;

      const existing = await this.db.query(
        `SELECT id FROM dbo.icr_section_configs WHERE templateId = @param0 AND sectionType = @param1`,
        [templateId, sec.sectionType],
      );

      const ownershipJson = sec.ownership ? JSON.stringify(sec.ownership) : null;
      const editableJson = JSON.stringify(sec.editableFields ?? []);
      const tablesJson = JSON.stringify(sec.tables ?? []);
      const placeholdersJson = JSON.stringify(sec.placeholders ?? []);
      const rawContentJson: string | null = null;

      if (existing?.length) {
        const req = new sql.Request(pool);
        req.input('titleAr', sql.NVarChar(500), sec.titleAr);
        req.input('titleEn', sql.NVarChar(200), sec.titleEn);
        req.input('sortOrder', sql.Int, sec.sortOrder);
        req.input('paraIndex', sql.Int, sec.paraIndex ?? null);
        req.input('contentType', sql.NVarChar(20), sec.contentType);
        req.input('isEnabled', sql.Bit, sec.isEnabled ? 1 : 0);
        req.input('ownership', sql.NVarChar(sql.MAX), ownershipJson);
        req.input('editableFields', sql.NVarChar(sql.MAX), editableJson);
        req.input('tables', sql.NVarChar(sql.MAX), tablesJson);
        req.input('placeholders', sql.NVarChar(sql.MAX), placeholdersJson);
        req.input('sourceFilename', sql.NVarChar(500), filename);
        req.input('rawContent', sql.NVarChar(sql.MAX), rawContentJson);
        req.input('templateId', sql.Int, templateId);
        req.input('sectionType', sql.NVarChar(80), sec.sectionType);

        await req.query(`
          UPDATE dbo.icr_section_configs SET
            titleAr = @titleAr, titleEn = @titleEn, sortOrder = @sortOrder,
            paraIndex = @paraIndex, contentType = @contentType, isEnabled = @isEnabled,
            ownership = @ownership, editableFields = @editableFields,
            tables = @tables, placeholders = @placeholders,
            sourceFilename = @sourceFilename, rawContent = @rawContent,
            updatedAt = GETUTCDATE()
          WHERE templateId = @templateId AND sectionType = @sectionType
        `);
      } else {
        const req = new sql.Request(pool);
        req.input('templateId', sql.Int, templateId);
        req.input('sectionType', sql.NVarChar(80), sec.sectionType);
        req.input('titleAr', sql.NVarChar(500), sec.titleAr);
        req.input('titleEn', sql.NVarChar(200), sec.titleEn);
        req.input('sortOrder', sql.Int, sec.sortOrder);
        req.input('paraIndex', sql.Int, sec.paraIndex ?? null);
        req.input('contentType', sql.NVarChar(20), sec.contentType);
        req.input('isEnabled', sql.Bit, sec.isEnabled ? 1 : 0);
        req.input('ownership', sql.NVarChar(sql.MAX), ownershipJson);
        req.input('editableFields', sql.NVarChar(sql.MAX), editableJson);
        req.input('tables', sql.NVarChar(sql.MAX), tablesJson);
        req.input('placeholders', sql.NVarChar(sql.MAX), placeholdersJson);
        req.input('sourceFilename', sql.NVarChar(500), filename);
        req.input('rawContent', sql.NVarChar(sql.MAX), rawContentJson);

        await req.query(`
          INSERT INTO dbo.icr_section_configs (
            templateId, sectionType, titleAr, titleEn, sortOrder, paraIndex,
            contentType, isEnabled, ownership, editableFields,
            tables, placeholders, sourceFilename, rawContent,
            createdAt, updatedAt
          ) VALUES (
            @templateId, @sectionType, @titleAr, @titleEn, @sortOrder, @paraIndex,
            @contentType, @isEnabled, @ownership, @editableFields,
            @tables, @placeholders, @sourceFilename, @rawContent,
            GETUTCDATE(), GETUTCDATE()
          )
        `);
      }

      results.push({ ...sec, templateId, sourceFilename: filename });
    }

    this.logger.log(`Saved ${results.length} section configs for template ${templateId}`);
    return results;
  }

  async getConfigs(templateId?: number): Promise<SectionConfigRow[]> {
    let query: string;
    let params: unknown[];

    if (templateId) {
      query = `SELECT * FROM dbo.icr_section_configs WHERE templateId = @param0 ORDER BY sortOrder ASC`;
      params = [templateId];
    } else {
      query = `SELECT * FROM dbo.icr_section_configs ORDER BY sortOrder ASC`;
      params = [];
    }

    const rows = await this.db.query(query, params);
    return (rows ?? []).map(mapConfigRow);
  }

  async getConfigsForDefault(): Promise<SectionConfigRow[]> {
    const tpl = await this.getDefaultTemplate();
    if (!tpl) return [];
    return this.getConfigs(tpl.id);
  }

  async updateConfig(
    sectionType: string,
    patch: Partial<SectionConfigRow>,
    templateId?: number,
  ): Promise<SectionConfigRow> {
    let whereClause = `sectionType = @paramW`;
    const whereParams: unknown[] = [sectionType];

    if (templateId) {
      whereClause = `templateId = @paramT AND sectionType = @paramW`;
      whereParams.unshift(templateId);
    }

    const existing = await this.db.query(
      `SELECT * FROM dbo.icr_section_configs WHERE ${whereClause.replace('@paramT', '@param0').replace('@paramW', templateId ? '@param1' : '@param0')}`,
      whereParams,
    );

    if (!existing?.length) {
      throw new NotFoundException(`Section config "${sectionType}" not found.`);
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let pi = 0;

    const addSet = (col: string, val: unknown) => {
      sets.push(`${col} = @param${pi}`);
      params.push(val);
      pi++;
    };

    if (patch.titleAr !== undefined)        addSet('titleAr', patch.titleAr);
    if (patch.titleEn !== undefined)        addSet('titleEn', patch.titleEn);
    if (patch.sortOrder !== undefined)      addSet('sortOrder', patch.sortOrder);
    if (patch.contentType !== undefined)    addSet('contentType', patch.contentType);
    if (patch.isEnabled !== undefined)      addSet('isEnabled', patch.isEnabled ? 1 : 0);
    if (patch.ownership !== undefined)      addSet('ownership', JSON.stringify(patch.ownership));
    if (patch.editableFields !== undefined) addSet('editableFields', JSON.stringify(patch.editableFields));

    if (sets.length === 0) return mapConfigRow(existing[0]);

    addSet('updatedAt', new Date());

    const id = existing[0].id;
    params.push(id);

    await this.db.query(
      `UPDATE dbo.icr_section_configs SET ${sets.join(', ')} WHERE id = @param${pi}`,
      params,
    );

    const updated = await this.db.query(
      `SELECT * FROM dbo.icr_section_configs WHERE id = @param0`,
      [id],
    );
    return mapConfigRow(updated[0]);
  }

  async deleteConfig(sectionType: string, templateId?: number): Promise<void> {
    if (templateId) {
      await this.db.query(
        `DELETE FROM dbo.icr_section_configs WHERE templateId = @param0 AND sectionType = @param1`,
        [templateId, sectionType],
      );
    } else {
      await this.db.query(
        `DELETE FROM dbo.icr_section_configs WHERE sectionType = @param0`,
        [sectionType],
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Seed defaults (creates a "ADIB Default" template + sections)
  // ═══════════════════════════════════════════════════════════════════

  async seedFromDefaults(): Promise<{ seeded: number; templateId: number; message: string }> {
    let tpl = await this.getDefaultTemplate();
    if (tpl) {
      const existingConfigs = await this.getConfigs(tpl.id);
      if (existingConfigs.length > 0) {
        return { seeded: 0, templateId: tpl.id, message: 'Default template with configs already exists, skipping seed.' };
      }
    }

    if (!tpl) {
      tpl = await this.createTemplate(
        'ADIB ICR Default Template',
        'Default CBE Internal Control Report template based on COSO 2013',
        'hardcoded-defaults',
        'System',
        null,
      );
      await this.setDefaultTemplate(tpl.id);
    }

    const sectionTypes = Object.values(IcrSectionType);
    let seeded = 0;

    for (let i = 0; i < sectionTypes.length; i++) {
      const st = sectionTypes[i];
      const owner = SECTION_OWNERSHIP_MAP[st];
      const defaultLabel = DEFAULT_SECTION_OWNERS[st];
      const ctMap = SECTION_CONTENT_TYPE_MAP[st] ?? IcrContentType.DYNAMIC;
      const editableKeys = ICR_SECTION_EDITABLE_KEYS[st] ?? [];

      const editableFields = editableKeys.map(k => ({
        key: k, labelAr: k, labelEn: k.replace(/([A-Z])/g, ' $1').trim(), type: 'text',
      }));

      await this.db.query(
        `INSERT INTO dbo.icr_section_configs (
           templateId, sectionType, titleAr, titleEn, sortOrder, contentType, isEnabled,
           ownership, editableFields, tables, placeholders, sourceFilename,
           createdAt, updatedAt
         ) VALUES (
           @param0, @param1, @param2, @param3, @param4, @param5, 1,
           @param6, @param7, '[]', '[]', 'hardcoded-defaults',
           GETUTCDATE(), GETUTCDATE()
         )`,
        [
          tpl.id,
          st,
          defaultLabel?.label ?? st,
          st.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          i + 1,
          ctMap,
          owner ? JSON.stringify({ makerFunction: owner.makerFunction, checkerFunction: owner.checkerFunction }) : null,
          JSON.stringify(editableFields),
        ],
      );
      seeded++;
    }

    this.logger.log(`Seeded ${seeded} section configs for template ${tpl.id}`);
    return { seeded, templateId: tpl.id, message: `${seeded} section configs seeded into template "${tpl.name}".` };
  }
}
