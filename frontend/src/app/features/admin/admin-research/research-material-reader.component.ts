import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ResearchDocument, ResearchLibraryExcerptReference } from '../../../core/api/research.api';
import { ResearchExcerptCaptureComponent } from './research-excerpt-capture.component';

@Component({
  standalone: true,
  selector: 'app-research-material-reader',
  imports: [ResearchExcerptCaptureComponent],
  templateUrl: './research-material-reader.component.html',
  styleUrl: './research-material-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchMaterialReaderComponent {
  @Input({ required: true }) researchId = '';
  @Input() materials: ResearchDocument[] = [];
  @Output() excerptCreated = new EventEmitter<ResearchLibraryExcerptReference>();

  selectedMaterialId = '';

  get textMaterials(): ResearchDocument[] {
    return this.materials.filter(
      (material) =>
        material.kind === 'TEXT' && material.status === 'READY' && material.content !== null,
    );
  }

  get selectedMaterial(): ResearchDocument | null {
    return (
      this.textMaterials.find((material) => material.id === this.selectedMaterialId) ??
      this.textMaterials[0] ??
      null
    );
  }

  selectMaterial(materialId: string): void {
    this.selectedMaterialId = materialId;
  }

  onExcerptCreated(excerpt: ResearchLibraryExcerptReference, material: ResearchDocument): void {
    this.excerptCreated.emit({ ...excerpt, sourceId: material.sourceId });
  }
}
