import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ResearchDocument,
  ResearchLibraryExcerpt,
  ResearchLibraryExcerptReference,
} from '../../../core/api/research.api';
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
  private _materials: ResearchDocument[] = [];

  @Input({ required: true }) researchId = '';
  @Input() selectedMaterialId = '';
  @Input() showMaterialList = true;
  @Input() set materials(value: ResearchDocument[]) {
    this._materials = value;
    this.focusMaterial();
  }
  get materials(): ResearchDocument[] {
    return this._materials;
  }
  @Input() set focusExcerpt(value: ResearchLibraryExcerpt | null) {
    this.focusedExcerpt = value;
    this.focusMaterial();
  }
  @Output() excerptCreated = new EventEmitter<ResearchLibraryExcerptReference>();
  @Output() retryRequested = new EventEmitter<string>();

  focusedExcerpt: ResearchLibraryExcerpt | null = null;

  get textMaterials(): ResearchDocument[] {
    return this.materials.filter(
      (material) => material.status === 'READY' && material.content !== null,
    );
  }

  get failedMaterials(): ResearchDocument[] {
    return this.materials.filter((material) => material.status === 'FAILED');
  }

  get selectedMaterial(): ResearchDocument | null {
    return (
      this.textMaterials.find((material) => material.id === this.selectedMaterialId) ??
      this.textMaterials[0] ??
      null
    );
  }

  retry(materialId: string): void {
    this.retryRequested.emit(materialId);
  }

  selectMaterial(materialId: string): void {
    this.selectedMaterialId = materialId;
  }

  onExcerptCreated(excerpt: ResearchLibraryExcerptReference, material: ResearchDocument): void {
    this.excerptCreated.emit({ ...excerpt, sourceId: material.sourceId });
  }

  private focusMaterial(): void {
    const versionId = this.focusedExcerpt?.materialVersion.id;
    const material = versionId
      ? this.textMaterials.find((item) => item.materialVersionId === versionId)
      : undefined;
    if (material) this.selectedMaterialId = material.id;
  }
}
