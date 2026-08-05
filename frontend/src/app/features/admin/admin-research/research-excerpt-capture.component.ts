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
import { ResearchApi, ResearchLibraryExcerptReference } from '../../../core/api/research.api';

@Component({
  standalone: true,
  selector: 'app-research-excerpt-capture',
  imports: [FormsModule],
  templateUrl: './research-excerpt-capture.component.html',
  styleUrl: './research-excerpt-capture.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchExcerptCaptureComponent {
  private readonly api = inject(ResearchApi);
  private readonly changeDetector = inject(ChangeDetectorRef);

  @Input({ required: true }) researchId = '';
  @Input({ required: true }) materialVersionId = '';
  @Input({ required: true }) sourceTitle = '';
  @Input() set selection(value: { locator: string; text: string } | null) {
    if (!value) return;
    this.locator = value.locator;
    this.text = value.text;
    this.saved = false;
    this.error = '';
    this.changeDetector.markForCheck();
  }
  @Output() created = new EventEmitter<ResearchLibraryExcerptReference>();
  @Output() cancelled = new EventEmitter<void>();

  locator = '';
  text = '';
  busy = false;
  saved = false;
  error = '';

  save(): void {
    const locator = this.locator.trim();
    const text = this.text.trim();
    if (!this.researchId || !this.materialVersionId || !locator || !text || this.busy) return;

    this.busy = true;
    this.saved = false;
    this.error = '';
    this.changeDetector.markForCheck();
    this.api
      .createLibraryExcerpt(this.researchId, {
        materialVersionId: this.materialVersionId,
        locator,
        text,
      })
      .subscribe({
        next: (excerpt) => {
          this.created.emit(excerpt);
          this.locator = '';
          this.text = '';
          this.busy = false;
          this.saved = true;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.busy = false;
          this.error = 'No se pudo registrar el extracto.';
          this.changeDetector.markForCheck();
        },
      });
  }
}
