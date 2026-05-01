import { PartialType } from '@nestjs/mapped-types';
import { CreateHomeDeckDto } from './create-home-deck.dto';

export class UpdateHomeDeckDto extends PartialType(CreateHomeDeckDto) {}
