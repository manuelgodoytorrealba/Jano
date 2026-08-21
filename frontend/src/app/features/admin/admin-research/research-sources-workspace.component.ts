import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';
import {
  ResearchApi,
  ResearchProjectCitation,
  ResearchProjectSource,
  ResearchSourceRecord,
} from '../../../core/api/research.api';
import { LibraryMaterial } from '../../../core/api/library.api';
import { ResearchDocument, ResearchEvidence } from '../../../core/api/research.api';

@Component({
  standalone: true,
  selector: 'app-research-sources-workspace',
  imports: [FormsModule],
  templateUrl: './research-sources-workspace.component.html',
  styleUrl: './research-sources-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchSourcesWorkspaceComponent {
  private readonly api = inject(ResearchApi);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) researchId = '';
  @Input() sources: ResearchProjectSource[] = [];
  @Input() materials: ResearchDocument[] = [];
  @Input() libraryMaterials: LibraryMaterial[] = [];
  @Input() evidence: ResearchEvidence[] = [];
  @Input() citations: ResearchProjectCitation[] = [];
  @Input() materialCount = 0;
  @Output() saved = new EventEmitter<void>();

  search = '';
  note = '';
  results: ResearchSourceRecord[] = [];
  selected: ResearchSourceRecord | null = null;
  hasSearched = false;
  searching = false;
  associating = false;
  citingMaterialId = '';
  removingCitationId = '';
  error = '';
  guideOpen = false;
  searchType: 'all' | 'sources' | 'materials' = 'all';
  searchTab: 'sources' | 'materials' = 'sources';
  workedTab: 'materials' | 'excerpts' | 'evidence' = 'excerpts';
  showAllMaterials = false;
  showAllExcerpts = false;
  showAllEvidence = false;

  searchSources(): void {
    const query = this.search.trim();
    if (!query || this.searching) return;
    this.searching = true;
    this.hasSearched = true;
    this.error = '';
    this.selected = null;
    if (this.searchType === 'materials') {
      this.results = [];
      this.searchTab = 'materials';
      this.searching = false;
      this.cdr.markForCheck();
      return;
    }
    this.searchTab = 'sources';
    this.api.searchSources(query).subscribe({
      next: (results) => {
        this.results = results;
        this.searching = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.results = [];
        this.searching = false;
        this.error = 'No se pudieron buscar las fuentes.';
        this.cdr.markForCheck();
      },
    });
  }

  associate(): void {
    if (!this.selected || this.associating || this.isAssociated(this.selected.id)) return;
    this.associating = true;
    this.error = '';
    this.api
      .addSource(this.researchId, {
        sourceId: this.selected.id,
        note: this.note.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.search = '';
          this.note = '';
          this.results = [];
          this.selected = null;
          this.hasSearched = false;
          this.associating = false;
          this.cdr.markForCheck();
          this.saved.emit();
        },
        error: () => {
          this.associating = false;
          this.error = 'No se pudo asociar la fuente.';
          this.cdr.markForCheck();
        },
      });
  }

  associateSource(source: ResearchSourceRecord): void {
    if (this.associating || this.isAssociated(source.id)) return;
    this.associating = true;
    this.error = '';
    this.api.addSource(this.researchId, { sourceId: source.id }).subscribe({
      next: () => {
        this.associating = false;
        this.cdr.markForCheck();
        this.saved.emit();
      },
      error: () => {
        this.associating = false;
        this.error = 'No se pudo añadir la fuente.';
        this.cdr.markForCheck();
      },
    });
  }

  addMaterial(materialId: string): void {
    if (this.associating || this.isInCorpus(materialId)) return;
    this.associating = true;
    this.error = '';
    this.api.associateLibraryMaterial(this.researchId, materialId).subscribe({
      next: () => {
        this.associating = false;
        this.cdr.markForCheck();
        this.saved.emit();
      },
      error: () => {
        this.associating = false;
        this.error = 'No se pudo añadir el material al Corpus.';
        this.cdr.markForCheck();
      },
    });
  }

  globalMaterials(): LibraryMaterial[] {
    const query = this.search.trim().toLocaleLowerCase();
    return query
      ? this.libraryMaterials.filter((material) =>
          material.title.toLocaleLowerCase().includes(query),
        )
      : [];
  }

  visibleSourceResults(): ResearchSourceRecord[] {
    return this.searchType === 'materials' ? [] : this.results.slice(0, 4);
  }

  visibleMaterialResults(): LibraryMaterial[] {
    return this.searchType === 'sources' ? [] : this.globalMaterials().slice(0, 4);
  }

  isInCorpus(materialId: string): boolean {
    return this.materials.some((material) => material.id === materialId);
  }

  materialMeta(material: LibraryMaterial): string {
    return [material.kind, material.version?.originalName].filter(Boolean).join(' · ');
  }

  excerptCount(): number {
    return this.materials.reduce((count, material) => count + (material.excerpts?.length ?? 0), 0);
  }

  excerpts(): Array<{ id: string; locator: string; text: string; material: ResearchDocument }> {
    return this.materials
      .flatMap((material) => (material.excerpts ?? []).map((excerpt) => ({ ...excerpt, material })))
      .sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));
  }

  visibleMaterials(): ResearchDocument[] {
    return this.showAllMaterials ? this.materials : this.materials.slice(0, 3);
  }
  visibleExcerpts(): Array<{
    id: string;
    locator: string;
    text: string;
    material: ResearchDocument;
  }> {
    return this.showAllExcerpts ? this.excerpts() : this.excerpts().slice(0, 3);
  }
  visibleEvidence(): ResearchEvidence[] {
    return this.showAllEvidence ? this.evidence : this.evidence.slice(0, 3);
  }

  citeMaterial(materialId: string, alreadyInResearch: boolean): void {
    if (this.citingMaterialId) return;
    this.citingMaterialId = materialId;
    const request = alreadyInResearch
      ? this.api.citeResearchItem(this.researchId, 'material', materialId)
      : this.api
          .associateLibraryMaterial(this.researchId, materialId)
          .pipe(
            switchMap(() => this.api.citeResearchItem(this.researchId, 'material', materialId)),
          );
    request.subscribe({
      next: () => {
        this.citingMaterialId = '';
        this.cdr.markForCheck();
        this.saved.emit();
      },
      error: () => {
        this.citingMaterialId = '';
        this.error = 'No se pudo añadir el material como fuente citada.';
        this.cdr.markForCheck();
      },
    });
  }

  citeSource(sourceId: string): void {
    if (this.citingMaterialId || this.isAssociated(sourceId)) return;
    this.citingMaterialId = sourceId;
    this.api.addSource(this.researchId, { sourceId }).subscribe({
      next: () => {
        this.citingMaterialId = '';
        this.saved.emit();
      },
      error: () => {
        this.citingMaterialId = '';
        this.error = 'No se pudo añadir la fuente citada.';
        this.cdr.markForCheck();
      },
    });
  }

  isAssociated(sourceId: string): boolean {
    return this.sources.some((source) => source.sourceId === sourceId);
  }

  isCitedMaterial(material: ResearchDocument): boolean {
    return !!material.sourceId && this.isAssociated(material.sourceId);
  }

  evidenceStatement(evidence: ResearchEvidence): string {
    return this.preview(evidence.context || 'Sin explicación editorial todavía.');
  }

  evidencePassage(evidence: ResearchEvidence): string {
    return this.preview(
      evidence.libraryExcerpt?.text || evidence.quote || 'Pasaje sin transcripción.',
    );
  }

  isCited(kind: 'material' | 'excerpt' | 'evidence', id: string): boolean {
    const key =
      kind === 'material' ? 'materialId' : kind === 'excerpt' ? 'libraryExcerptId' : 'evidenceId';
    return this.citations.some((citation) => citation[key] === id);
  }

  citeItem(kind: 'material' | 'excerpt' | 'evidence', itemId: string, sourceId?: string): void {
    if (this.citingMaterialId || this.isCited(kind, itemId)) return;
    this.citingMaterialId = itemId;
    this.api.citeResearchItem(this.researchId, kind, itemId, sourceId).subscribe({
      next: () => {
        this.citingMaterialId = '';
        this.saved.emit();
      },
      error: () => {
        this.citingMaterialId = '';
        this.error = 'No se pudo citar este elemento.';
        this.cdr.markForCheck();
      },
    });
  }

  citeLabel(kind: 'material' | 'excerpt' | 'evidence', id: string): string {
    if (this.citingMaterialId === id) return 'Citando…';
    if (this.isCited(kind, id)) return 'Citado ✓';
    return kind === 'material'
      ? 'Citar material'
      : kind === 'excerpt'
        ? 'Citar extracto'
        : 'Citar evidencia';
  }

  excerptTitle(text: string): string {
    return this.preview(text, 68) || 'Extracto documental';
  }

  publicationSelections(sourceId: string): ResearchProjectCitation[] {
    return this.citations.filter((citation) => citation.sourceId === sourceId);
  }

  visiblePublicationSelections(sourceId: string): ResearchProjectCitation[] {
    return this.publicationSelections(sourceId).slice(0, 3);
  }

  hiddenPublicationSelectionCount(sourceId: string): number {
    return Math.max(0, this.publicationSelections(sourceId).length - 3);
  }

  publicationExcerptCount(sourceId: string): number {
    return this.publicationSelections(sourceId).filter((citation) => !!citation.libraryExcerptId)
      .length;
  }

  publicationEvidenceCount(sourceId: string): number {
    return this.publicationSelections(sourceId).filter((citation) => !!citation.evidenceId).length;
  }

  citationLabel(citation: ResearchProjectCitation): string {
    if (citation.evidenceId)
      return this.preview(
        citation.evidence?.context || citation.evidence?.quote || 'Evidencia editorial',
        72,
      );
    if (citation.libraryExcerptId)
      return this.preview(citation.libraryExcerpt?.text || 'Extracto documental', 72);
    return citation.material?.title || 'Material completo';
  }

  citationLocator(citation: ResearchProjectCitation): string {
    if (citation.evidenceId) return citation.evidence?.locator || 'Pasaje documental';
    if (citation.libraryExcerptId) return citation.libraryExcerpt?.locator || 'Extracto documental';
    return 'Material completo';
  }

  removeSource(sourceId: string): void {
    if (!confirm('¿Quitar esta fuente de la investigación?')) return;
    this.api.removeSource(this.researchId, sourceId).subscribe({
      next: () => this.saved.emit(),
      error: () => {
        this.error = 'No se pudo quitar la fuente.';
        this.cdr.markForCheck();
      },
    });
  }

  removeCitation(citationId: string): void {
    if (this.removingCitationId) return;
    this.removingCitationId = citationId;
    this.api.removeCitation(this.researchId, citationId).subscribe({
      next: () => {
        this.removingCitationId = '';
        this.saved.emit();
      },
      error: () => {
        this.removingCitationId = '';
        this.error = 'No se pudo quitar la cita.';
        this.cdr.markForCheck();
      },
    });
  }

  preview(text: string, limit = 180): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    return normalized.length > limit ? `${normalized.slice(0, limit).trimEnd()}…` : normalized;
  }

  sourceMeta(source: ResearchSourceRecord | null | undefined): string {
    if (!source) return '';
    return [source.author, source.publisher, source.year].filter(Boolean).join(' · ');
  }

  sourceTypeLabel(type: string | null | undefined): string {
    return (
      (
        { ARTICLE: 'Artículo', BOOK: 'Libro', CATALOG: 'Catálogo', WEBSITE: 'Sitio web' } as Record<
          string,
          string
        >
      )[type ?? ''] ??
      type ??
      'Referencia'
    );
  }
}
