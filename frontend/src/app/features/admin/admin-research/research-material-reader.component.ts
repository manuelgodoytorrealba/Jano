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
  ResearchApi,
  ResearchDocument,
  ResearchEvidence,
  ResearchLibraryExcerpt,
  ResearchLibraryExcerptReference,
} from '../../../core/api/research.api';
import { FormsModule } from '@angular/forms';
import { ResearchExcerptCaptureComponent } from './research-excerpt-capture.component';

type ReaderContentSegment = {
  text: string;
  excerpt?: ResearchLibraryExcerptReference;
};

@Component({
  standalone: true,
  selector: 'app-research-material-reader',
  imports: [FormsModule, ResearchExcerptCaptureComponent],
  templateUrl: './research-material-reader.component.html',
  styleUrl: './research-material-reader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchMaterialReaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly api = inject(ResearchApi);
  private _materials: ResearchDocument[] = [];

  @Input({ required: true }) researchId = '';
  @Input() selectedMaterialId = '';
  @Input() showMaterialList = true;
  @Input() evidence: ResearchEvidence[] = [];
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
  @Output() dataChanged = new EventEmitter<void>();

  focusedExcerpt: ResearchLibraryExcerpt | null = null;
  fullscreen = false;
  excerptComposerOpen = false;
  selectionDraft: { locator: string; text: string; x: number; y: number } | null = null;
  excerptMenu: { excerpt: ResearchLibraryExcerptReference; x: number; y: number } | null = null;
  excerptActionError = '';
  evidenceComposer: ResearchLibraryExcerptReference | null = null;
  evidenceExplanation = '';
  evidenceNote = '';
  evidenceBusy = false;
  editingExcerpt: ResearchLibraryExcerptReference | null = null;
  editingEvidence: ResearchEvidence | null = null;
  editLocator = '';
  editText = '';
  editContext = '';
  editNote = '';

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

  contentSegments(material: ResearchDocument): ReaderContentSegment[] {
    const content = material.content ?? '';
    const matches = (material.excerpts ?? [])
      .filter((excerpt) => excerpt.isHighlight)
      .map((excerpt) => {
        const locatorMatch = /^caracteres (\d+)–(\d+)$/.exec(excerpt.locator);
        const start = locatorMatch ? Number(locatorMatch[1]) - 1 : content.indexOf(excerpt.text);
        const end = locatorMatch ? Number(locatorMatch[2]) : start + excerpt.text.length;
        return content.slice(start, end) === excerpt.text ? { excerpt, start, end } : null;
      })
      .filter(
        (
          match,
        ): match is { excerpt: ResearchLibraryExcerptReference; start: number; end: number } =>
          match !== null,
      )
      .sort((left, right) => left.start - right.start);

    const segments: ReaderContentSegment[] = [];
    let offset = 0;
    for (const match of matches) {
      if (match.start < offset) continue;
      if (match.start > offset) segments.push({ text: content.slice(offset, match.start) });
      segments.push({ text: match.excerpt.text, excerpt: match.excerpt });
      offset = match.end;
    }
    if (offset < content.length || !segments.length) segments.push({ text: content.slice(offset) });
    return segments;
  }

  highlights(material: ResearchDocument): ResearchLibraryExcerptReference[] {
    return (material.excerpts ?? []).filter((excerpt) => excerpt.isHighlight);
  }

  evidenceFor(excerpt: ResearchLibraryExcerptReference): ResearchEvidence | undefined {
    return this.evidence.find((evidence) => evidence.libraryExcerptId === excerpt.id);
  }

  excerptsFor(material: ResearchDocument): ResearchLibraryExcerptReference[] {
    return [...(material.excerpts ?? [])].sort((left, right) =>
      (right.createdAt ?? '').localeCompare(left.createdAt ?? ''),
    );
  }

  evidenceForMaterial(material: ResearchDocument): ResearchEvidence[] {
    return this.evidence.filter(
      (item) =>
        item.libraryExcerpt?.materialVersion.material.id === material.id ||
        (item.libraryExcerptId &&
          (material.excerpts ?? []).some((excerpt) => excerpt.id === item.libraryExcerptId)),
    );
  }

  editExcerpt(excerpt: ResearchLibraryExcerptReference): void {
    this.editingEvidence = null;
    this.editingExcerpt = excerpt;
    this.editLocator = excerpt.locator;
    this.editText = excerpt.text;
  }

  saveExcerpt(): void {
    const excerpt = this.editingExcerpt;
    if (!excerpt || !this.editLocator.trim() || !this.editText.trim()) return;
    this.api
      .updateLibraryExcerpt(this.researchId, excerpt.id, {
        locator: this.editLocator,
        text: this.editText,
      })
      .subscribe({
        next: () => {
          this.editingExcerpt = null;
          this.dataChanged.emit();
        },
        error: () => (this.excerptActionError = 'No se pudo actualizar el extracto.'),
      });
  }

  editEvidence(evidence: ResearchEvidence): void {
    this.editingExcerpt = null;
    this.editingEvidence = evidence;
    this.editContext = evidence.context ?? '';
    this.editNote = evidence.note ?? '';
  }

  saveEditedEvidence(): void {
    const evidence = this.editingEvidence;
    if (!evidence) return;
    this.api
      .updateEvidence(this.researchId, evidence.id, {
        context: this.editContext,
        note: this.editNote,
      })
      .subscribe({
        next: () => {
          this.editingEvidence = null;
          this.dataChanged.emit();
        },
        error: () => (this.excerptActionError = 'No se pudo actualizar la evidencia.'),
      });
  }

  openExcerptMenu(event: MouseEvent, excerpt: ResearchLibraryExcerptReference): void {
    event.preventDefault();
    this.clearSelection();
    this.excerptActionError = '';
    const width = this.document.defaultView?.innerWidth ?? 1280;
    const height = this.document.defaultView?.innerHeight ?? 800;
    const reference = (
      this.host.nativeElement.offsetParent as HTMLElement | null
    )?.getBoundingClientRect();
    const left = reference?.left ?? 0;
    const top = reference?.top ?? 0;
    this.excerptMenu = {
      excerpt,
      x: Math.max(12, Math.min(event.clientX - left, width - left - 230)),
      y: Math.max(12, Math.min(event.clientY - top, height - top - 120)),
    };
  }

  createEvidenceFromExcerpt(excerpt: ResearchLibraryExcerptReference): void {
    this.excerptMenu = null;
    this.evidenceComposer = excerpt;
    this.evidenceExplanation = '';
    this.evidenceNote = '';
    this.excerptActionError = '';
  }

  saveEvidence(): void {
    const excerpt = this.evidenceComposer;
    const context = this.evidenceExplanation.trim();
    if (!excerpt || !context || this.evidenceBusy) return;
    this.evidenceBusy = true;
    this.api
      .createEvidenceFromExcerpt(this.researchId, excerpt.id, {
        context,
        note: this.evidenceNote.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.evidenceBusy = false;
          this.evidenceComposer = null;
          this.dataChanged.emit();
        },
        error: () => {
          this.evidenceBusy = false;
          this.excerptActionError = 'No se pudo convertir el extracto en evidencia.';
        },
      });
  }

  cancelEvidence(): void {
    this.evidenceComposer = null;
    this.excerptActionError = '';
  }

  deleteExcerptEvidence(evidence: ResearchEvidence): void {
    if (!this.document.defaultView?.confirm('¿Eliminar esta evidencia? El extracto se conservará.'))
      return;
    this.api.deleteEvidence(this.researchId, evidence.id).subscribe({
      next: () => this.finishExcerptAction(),
      error: () => (this.excerptActionError = 'No se pudo eliminar la evidencia.'),
    });
  }

  deleteExcerpt(excerpt: ResearchLibraryExcerptReference): void {
    if (!this.document.defaultView?.confirm('¿Eliminar este extracto?')) return;
    this.api.deleteLibraryExcerpt(this.researchId, excerpt.id).subscribe({
      next: () => this.finishExcerptAction(),
      error: () =>
        (this.excerptActionError = 'El extracto todavía se usa en una evidencia o Section.'),
    });
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

  @HostListener('document:click', ['$event'])
  closeTransientPanels(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) {
      const element = target instanceof Element ? target : target.parentElement;
      if (element?.closest('.research-reader__excerpt-menu, .research-reader__evidence-panel'))
        return;
    }
    this.excerptMenu = null;
    if (!this.evidenceBusy) this.evidenceComposer = null;
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

  private finishExcerptAction(): void {
    this.excerptMenu = null;
    this.excerptActionError = '';
    this.dataChanged.emit();
  }

  private focusMaterial(): void {
    const versionId = this.focusedExcerpt?.materialVersion.id;
    const material = versionId
      ? this.textMaterials.find((item) => item.materialVersionId === versionId)
      : undefined;
    if (material) this.selectedMaterialId = material.id;
  }
}
