import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
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
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
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
  fullscreen = false;
  excerptComposerOpen = false;
  selectionDraft: { locator: string; text: string; x: number; y: number } | null = null;

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
      this.materials.find(
        (material) => material.id === this.selectedMaterialId && material.content !== null,
      ) ??
      this.textMaterials[0] ??
      null
    );
  }

  retry(materialId: string): void {
    this.retryRequested.emit(materialId);
  }

  selectMaterial(materialId: string): void {
    this.selectedMaterialId = materialId;
    this.clearSelection();
  }

  captureSelection(content: HTMLElement): void {
    const selection = this.document.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!content.contains(range.startContainer) || !content.contains(range.endContainer)) return;

    const rawText = range.toString();
    const text = rawText.trim();
    if (!text) return;
    const prefix = range.cloneRange();
    prefix.selectNodeContents(content);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length + rawText.length - rawText.trimStart().length;
    const end = start + text.length;
    const rect = range.getBoundingClientRect?.() ?? content.getBoundingClientRect();
    const view = this.document.defaultView;
    const width = view?.innerWidth ?? 1280;
    const height = view?.innerHeight ?? 800;
    this.selectionDraft = {
      locator: `caracteres ${start + 1}–${end}`,
      text,
      x: Math.max(12, Math.min(rect.left, width - 220)),
      y: rect.bottom + 58 < height ? rect.bottom + 10 : Math.max(12, rect.top - 48),
    };
    this.excerptComposerOpen = false;
  }

  openExcerptComposer(): void {
    if (this.selectionDraft) this.excerptComposerOpen = true;
  }

  cancelExcerptComposer(): void {
    this.clearSelection();
  }

  async toggleFullscreen(): Promise<void> {
    if (this.document.fullscreenElement === this.host.nativeElement) {
      await this.document.exitFullscreen();
      return;
    }
    await this.host.nativeElement.requestFullscreen();
  }

  @HostListener('document:fullscreenchange')
  syncFullscreen(): void {
    this.fullscreen = this.document.fullscreenElement === this.host.nativeElement;
  }

  onExcerptCreated(excerpt: ResearchLibraryExcerptReference, material: ResearchDocument): void {
    this.clearSelection();
    this.excerptCreated.emit({ ...excerpt, sourceId: material.sourceId });
  }

  private clearSelection(): void {
    this.excerptComposerOpen = false;
    this.selectionDraft = null;
    this.document.getSelection()?.removeAllRanges();
  }

  private focusMaterial(): void {
    const versionId = this.focusedExcerpt?.materialVersion.id;
    const material = versionId
      ? this.textMaterials.find((item) => item.materialVersionId === versionId)
      : undefined;
    if (material) this.selectedMaterialId = material.id;
  }
}
