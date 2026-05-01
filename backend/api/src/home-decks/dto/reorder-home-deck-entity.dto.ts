import { IsInt } from 'class-validator';

export class ReorderHomeDeckEntityDto {
  @IsInt()
  sortOrder!: number;
}
