import { PartialType } from '@nestjs/mapped-types';
import { CreateEntityMediaDto } from './create-entity-media.dto';

export class UpdateEntityMediaDto extends PartialType(CreateEntityMediaDto) {}
