import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ResearchApi, ResearchEvidence } from '../../../core/api/research.api';

@Component({
  standalone: true,
  selector: 'app-research-claim-capture',
  imports: [FormsModule],
  templateUrl: './research-claim-capture.component.html',
  styleUrl: './research-claim-capture.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchClaimCaptureComponent {
  private readonly api = inject(ResearchApi);

  @Input({ required: true }) researchId = '';
  @Input() evidence: ResearchEvidence[] = [];
  @Output() saved = new EventEmitter<void>();

  title = '';
  summary = '';
  selectedEvidenceIds: string[] = [];
  busy = false;
  error = '';

  toggleEvidence(evidenceId: string, checked: boolean): void {
    this.selectedEvidenceIds = checked
      ? [...new Set([...this.selectedEvidenceIds, evidenceId])]
      : this.selectedEvidenceIds.filter((id) => id !== evidenceId);
  }

  isSelected(evidenceId: string): boolean {
    return this.selectedEvidenceIds.includes(evidenceId);
  }

  save(): void {
    const title = this.title.trim();
    const evidenceIds = [
      ...new Set(this.selectedEvidenceIds.map((id) => id.trim()).filter(Boolean)),
    ];
    if (!this.researchId || !title || !evidenceIds.length || this.busy) return;

    this.busy = true;
    this.error = '';
    this.api
      .createClaim(this.researchId, {
        kind: 'ASSERTION',
        title,
        summary: this.summary.trim() || undefined,
        evidenceIds,
      })
      .subscribe({
        next: () => {
          this.title = '';
          this.summary = '';
          this.selectedEvidenceIds = [];
          this.busy = false;
          this.saved.emit();
        },
        error: () => {
          this.busy = false;
          this.error = 'No se pudo registrar la afirmación.';
        },
      });
  }

  evidenceLabel(item: ResearchEvidence): string {
    return item.source?.title ?? 'Source asociada';
  }
}
