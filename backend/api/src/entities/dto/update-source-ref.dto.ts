import { PartialType } from '@nestjs/mapped-types';
import { CreateSourceRefDto } from './create-source-ref.dto';

export class UpdateSourceRefDto extends PartialType(CreateSourceRefDto) {}
