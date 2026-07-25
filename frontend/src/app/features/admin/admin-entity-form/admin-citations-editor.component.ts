import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CitationRecord,
  CitationsApi,
  CitationStance,
  CitationTarget,
} from '../../../core/api/citations.api';
import { SourceRecord, SourcesApi } from '../../../core/api/sources.api';

@Component({
  standalone: true,
  selector: 'app-admin-citations-editor',
  imports: [FormsModule],
  templateUrl: './admin-citations-editor.component.html',
  styleUrls: ['./admin-citations-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCitationsEditorComponent implements OnChanges {
  private readonly citationsApi = inject(CitationsApi);
  private readonly sourcesApi = inject(SourcesApi);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) target!: CitationTarget;
  @Input({ required: true }) targetId = '';

  citations: CitationRecord[] = [];
  sourceSearch = '';
  sourceResults: SourceRecord[] = [];
  selectedSource: SourceRecord | null = null;
  stance: CitationStance = 'SUPPORTS';
  locator = '';
  quote = '';
  note = '';
  saving = false;
  error = '';

  ngOnChanges(): void {
    if (this.targetId) this.load();
  }

  searchSources(): void {
    const q = this.sourceSearch.trim();
    if (q.length < 2) {
      this.sourceResults = [];
      return;
    }
    this.sourcesApi.search(q).subscribe({
      next: (sources) => {
        this.sourceResults = sources;
        this.cdr.markForCheck();
      },
      error: () => {
        this.sourceResults = [];
        this.cdr.markForCheck();
      },
    });
  }

  selectSource(source: SourceRecord): void {
    this.selectedSource = source;
    this.sourceSearch = source.title;
    this.sourceResults = [];
  }

  add(): void {
    if (!this.selectedSource || this.saving) return;
    this.saving = true;
    this.error = '';
    this.citationsApi
      .create(this.target, this.targetId, {
        sourceId: this.selectedSource.id,
        stance: this.stance,
        locator: this.text(this.locator),
        quote: this.text(this.quote),
        note: this.text(this.note),
      })
      .subscribe({
        next: (citation) => {
          this.citations = [...this.citations, citation];
          this.reset();
          this.saving = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.saving = false;
          this.error = error?.error?.message ?? 'No se pudo añadir la cita.';
          this.cdr.markForCheck();
        },
      });
  }

  remove(citation: CitationRecord): void {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    this.citationsApi.remove(citation.id).subscribe({
      next: () => {
        this.citations = this.citations.filter((item) => item.id !== citation.id);
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        this.error = error?.error?.message ?? 'No se pudo eliminar la cita.';
        this.cdr.markForCheck();
      },
    });
  }

  private load(): void {
    this.citationsApi.list(this.target, this.targetId).subscribe({
      next: (citations) => {
        this.citations = citations;
        this.cdr.markForCheck();
      },
      error: () => {
        this.citations = [];
        this.cdr.markForCheck();
      },
    });
  }

  private reset(): void {
    this.sourceSearch = '';
    this.selectedSource = null;
    this.stance = 'SUPPORTS';
    this.locator = '';
    this.quote = '';
    this.note = '';
  }

  private text(value: string): string | undefined {
    return value.trim() || undefined;
  }
}
