import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
  IsPositive,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IcrStatus, IcrFramework } from '../interfaces/icr-report.types';
import { IcrSectionType } from '../interfaces/icr-section.types';

export class ScopeFiltersDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  riskCategoryIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  businessUnitIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  controlOwnerIds?: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  riskRatingMin?: number;

  @IsOptional()
  @IsString()
  riskRatingMinLabel?: string;

  @IsOptional()
  @IsBoolean()
  includeClosedFindings?: boolean;
}

export class CreateIcrReportDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  reportingPeriod: string;

  @IsDateString()
  periodFrom: string;

  @IsDateString()
  periodTo: string;

  @IsOptional()
  @IsEnum(IcrFramework)
  framework?: IcrFramework;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessUnit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  division?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScopeFiltersDto)
  scopeFilters?: ScopeFiltersDto;

  /** template | generate — aligns with reporting_system_frontend2 create form */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reportMode?: string;

  @IsOptional()
  @IsInt()
  templateId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  makerFunction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  checkerFunction?: string;
}

export class UpdateIcrStatusDto {
  @IsEnum(IcrStatus)
  status: IcrStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @IsInt()
  @IsPositive()
  version: number;
}

export class RegenerateSectionDto {}

export class UpdateSectionNotesDto {
  @IsString()
  @MaxLength(2000)
  notes: string;
}

export class UpdateSectionOwnerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  sectionOwner: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  sectionOwnerInitials: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  makerFunction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  checkerFunction?: string;
}

export class UpdateSectionContentDto {
  @IsObject()
  content: Record<string, unknown>;
}

export class WorkflowActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class UpdateSectionDefaultDto {
  @IsObject()
  content: Record<string, unknown>;
}

export class ListIcrReportsQueryDto {
  @IsOptional()
  @IsEnum(IcrStatus)
  status?: IcrStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessUnit?: string;

  @IsOptional()
  @IsString()
  createdById?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  templateId?: number;
}
