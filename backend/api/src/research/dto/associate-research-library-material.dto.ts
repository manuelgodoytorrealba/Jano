import { IsNotEmpty, IsString } from 'class-validator';

export class AssociateResearchLibraryMaterialDto {
  @IsString()
  @IsNotEmpty()
  materialId!: string;
}
