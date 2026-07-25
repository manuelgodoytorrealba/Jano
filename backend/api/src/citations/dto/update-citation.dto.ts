import { PartialType } from '@nestjs/mapped-types';
import { CreateCitationDto } from './create-citation.dto';

export class UpdateCitationDto extends PartialType(CreateCitationDto) {}
