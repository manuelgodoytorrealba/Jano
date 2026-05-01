import { IsInt, IsOptional, IsString } from 'class-validator';

export class AddHomeDeckEntityDto {
  @IsString()
  entityId!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
