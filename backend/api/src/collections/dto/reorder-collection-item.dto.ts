import { IsInt } from 'class-validator';

export class ReorderCollectionItemDto {
  @IsInt()
  sortOrder!: number;
}
