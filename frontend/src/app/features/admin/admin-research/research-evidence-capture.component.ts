import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ResearchApi,
  ResearchEvidence,
  ResearchProjectSource,
  ResearchSourceRecord,
  ResearchLibraryExcerptReference,
} from '../../../core/api/research.api';

@Component({
  standalone: true,
  selector: 'app-research-evidence-capture',
  imports: [FormsModule],
  templateUrl: './research-evidence-capture.component.html',
  styleUrl: './research-evidence-capture.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchEvidenceCaptureComponent {
  private readonly api = inject(ResearchApi);
  private _sources: ResearchProjectSource[] = [];

  @Input({ required: true }) researchId = '';
  @Input() set sources(value: ResearchProjectSource[]) {
    this._sources = value;
    this.selectPreparedSource();
  }
  get sources(): ResearchProjectSource[] {
    return this._sources;
  }
  @Input() evidence: ResearchEvidence[] = [];
  @Input() allowSourceAssociation = true;
  @Input() set excerpt(value: ResearchLibraryExcerptReference | null) {
    this.preparedExcerpt = value;
    if (value) this.locator = value.locator;
    this.selectPreparedSource();
  }
  @Output() saved = new EventEmitter<void>();
  @Output() excerptUsed = new EventEmitter<void>();

  preparedExcerpt: ResearchLibraryExcerptReference | null = null;
  sourceId = '';
  sourceVersion = '';
  locator = '';
  quote = '';
  context = '';
  note = '';
  error = '';
  busy = false;
  sourceSearch = '';
  sourceResults: ResearchSourceRecord[] = [];
  selectedSource: ResearchSourceRecord | null = null;
  sourceNote = '';
  sourceError = '';
  searchingSources = false;
  associatingSource = false;

  get preparedSource(): ResearchProjectSource | undefined {
    const sourceId = this.preparedExcerpt?.sourceId;
    return sourceId ? this.sources.find((source) => source.sourceId === sourceId) : undefined;
  }

  selectSource(sourceId: string): void {
    this.sourceId = sourceId;
    this.error = '';
  }

  searchSources(): void {
    const query = this.sourceSearch.trim();
    if (!query || this.searchingSources) return;

    this.searchingSources = true;
    this.sourceError = '';
    this.selectedSource = null;
    this.api.searchSources(query).subscribe({
      next: (sources) => {
        this.sourceResults = sources;
        this.searchingSources = false;
      },
      error: () => {
        this.sourceResults = [];
        this.searchingSources = false;
        this.sourceError = 'No se pudieron buscar las Sources.';
      },
    });
  }

  selectSearchResult(source: ResearchSourceRecord): void {
    this.selectedSource = source;
    this.sourceError = '';
  }

  associateSource(): void {
    const source = this.selectedSource;
    if (!source || this.associatingSource || this.isAssociated(source.id)) return;

    this.associatingSource = true;
    this.sourceError = '';
    this.api
      .addSource(this.researchId, {
        sourceId: source.id,
        note: this.sourceNote.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.sourceId = source.id;
          this.sourceSearch = '';
          this.sourceResults = [];
          this.selectedSource = null;
          this.sourceNote = '';
          this.associatingSource = false;
          this.saved.emit();
        },
        error: () => {
          this.associatingSource = false;
          this.sourceError = 'No se pudo asociar la Source.';
        },
      });
  }

  save(): void {
    const sourceId = this.sourceId.trim();
    const sourceVersion = this.sourceVersion.trim();
    const locator = this.locator.trim();
    const quote = this.quote.trim();
    const libraryExcerptId = this.preparedExcerpt?.id;
    if (!sourceId || !sourceVersion || !locator || (!quote && !libraryExcerptId) || this.busy)
      return;

    this.busy = true;
    this.error = '';
    this.api
      .createEvidence(this.researchId, {
        sourceId,
        sourceVersion,
        locator,
        ...(libraryExcerptId ? { libraryExcerptId } : {}),
        ...(quote ? { quote } : {}),
        context: this.context.trim() || undefined,
        note: this.note.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.locator = '';
          this.quote = '';
          this.context = '';
          this.note = '';
          this.busy = false;
          if (libraryExcerptId) this.excerptUsed.emit();
          this.saved.emit();
        },
        error: () => {
          this.busy = false;
          this.error = 'No se pudo registrar la evidencia.';
        },
      });
  }

  sourceTitle(source: ResearchProjectSource): string {
    return source.source?.title ?? 'Fuente asociada';
  }

  evidenceFor(sourceId: string): ResearchEvidence[] {
    return this.evidence.filter((item) => item.sourceId === sourceId);
  }

  isAssociated(sourceId: string): boolean {
    return this.sources.some((source) => source.sourceId === sourceId);
  }

  private selectPreparedSource(): void {
    if (this.preparedSource) this.sourceId = this.preparedSource.sourceId;
  }
}
