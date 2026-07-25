import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEntityAttributeDto } from './attribute.dto';

export class UpdateEntityAttributeDto extends PartialType(
  OmitType(CreateEntityAttributeDto, ['definitionId'] as const),
) {}
