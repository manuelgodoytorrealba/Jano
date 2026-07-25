import { PickType } from '@nestjs/mapped-types';
import { CreateEntityDto } from './create-entity.dto';

export class CreateEntityDraftDto extends PickType(CreateEntityDto, ['type', 'kind'] as const) {}
