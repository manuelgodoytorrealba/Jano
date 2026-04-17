import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateContributorDto {
  @IsString()
  @MaxLength(180)
  name!: string;

  @IsString()
  @MaxLength(120)
  role!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
