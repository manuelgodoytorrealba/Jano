import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ResearchApi } from '../../../core/api/research.api';

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

  @Input({ required: true }) researchId = '';
  @Input({ required: true }) materialVersionId = '';

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
    this.api
      .createLibraryExcerpt(this.researchId, {
        materialVersionId: this.materialVersionId,
        locator,
        text,
      })
      .subscribe({
        next: () => {
          this.locator = '';
          this.text = '';
          this.busy = false;
          this.saved = true;
        },
        error: () => {
          this.busy = false;
          this.error = 'No se pudo registrar el extracto.';
        },
      });
  }
}
