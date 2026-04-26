import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { IcrSectionType } from '../interfaces/icr-section.types';

@Injectable()
export class ParseSectionTypePipe implements PipeTransform<string, IcrSectionType> {
  transform(value: string, _metadata: ArgumentMetadata): IcrSectionType {
    const upper = (value ?? '').trim().toUpperCase();

    if (!upper) {
      throw new BadRequestException('Section type must not be empty.');
    }

    return upper as IcrSectionType;
  }
}
