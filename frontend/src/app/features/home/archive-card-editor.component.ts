import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EntityTypesApi } from '../../core/api/entity-types.api';
import { PublicEntityTypeDefinition } from '../../core/api/entities.models';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-archive-card-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <dialog #dialog aria-labelledby="archive-editor-title" (cancel)="cancel($event)">
      <form (ngSubmit)="save()" [attr.aria-busy]="saving()">
        <header>
          <h2 id="archive-editor-title">{{ i18n.t('archive.editor.title') }}</h2>
          <button
            type="button"
            [disabled]="saving()"
            (click)="closed.emit()"
            [attr.aria-label]="i18n.t('archive.closeTypes')"
          >
            ×
          </button>
        </header>
        <p>{{ i18n.t('archive.editor.public') }}</p>
        <fieldset [disabled]="saving()">
          <div
            class="drop-zone"
            [class.dragging]="dragging()"
            (dragover)="dragOver($event)"
            (dragleave)="dragging.set(false)"
            (drop)="drop($event)"
          >
            @if (preview()) {
              <img [src]="preview()" alt="" />
            }
            <span>{{ i18n.t('archive.editor.drop') }}</span>
            <label class="choose"
              >{{ i18n.t('archive.editor.choose') }}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                (change)="choose($event)"
              />
            </label>
            <small>JPG, PNG, WebP, GIF, AVIF · 15 MB</small>
          </div>
          <div class="languages">
            <section>
              <h3>Español</h3>
              <label
                >{{ i18n.t('archive.editor.name')
                }}<input name="titleEs" maxlength="80" [(ngModel)]="draft.archiveTitleEs"
              /></label>
              <label
                >{{ i18n.t('archive.editor.description')
                }}<textarea
                  name="descriptionEs"
                  maxlength="280"
                  rows="3"
                  [(ngModel)]="draft.archiveDescriptionEs"
                ></textarea>
              </label>
            </section>
            <section>
              <h3>English</h3>
              <label
                >{{ i18n.t('archive.editor.name')
                }}<input name="titleEn" maxlength="80" [(ngModel)]="draft.archiveTitleEn"
              /></label>
              <label
                >{{ i18n.t('archive.editor.description')
                }}<textarea
                  name="descriptionEn"
                  maxlength="280"
                  rows="3"
                  [(ngModel)]="draft.archiveDescriptionEn"
                ></textarea>
              </label>
            </section>
          </div>
          <small>{{ i18n.t('archive.editor.fallback') }}</small>
        </fieldset>
        @if (error()) {
          <p role="alert">{{ i18n.t(error()) }}</p>
        }
        <footer>
          <button type="button" [disabled]="saving()" (click)="closed.emit()">
            {{ i18n.t('archive.editor.cancel') }}
          </button>
          <button type="submit" [disabled]="saving()">
            {{ i18n.t(saving() ? 'archive.editor.saving' : 'archive.editor.save') }}
          </button>
        </footer>
      </form>
    </dialog>
  `,
  styleUrl: './archive-card-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchiveCardEditorComponent implements AfterViewInit, OnInit, OnDestroy {
  readonly type = input.required<PublicEntityTypeDefinition>();
  readonly image = input('');
  readonly saved = output<void>();
  readonly closed = output<void>();
  readonly i18n = inject(I18nService);
  private readonly api = inject(EntityTypesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly preview = signal('');
  readonly dragging = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  draft = {
    archiveTitleEs: '',
    archiveTitleEn: '',
    archiveDescriptionEs: '',
    archiveDescriptionEn: '',
  };
  private file?: File;
  private objectUrl?: string;

  ngOnInit(): void {
    const type = this.type();
    for (const key of Object.keys(this.draft) as (keyof typeof this.draft)[])
      this.draft[key] = type[key] ?? '';
    this.preview.set(this.image());
  }
  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
  }
  cancel(event: Event): void {
    event.preventDefault();
    if (!this.saving()) this.closed.emit();
  }
  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectFile(input.files?.[0]);
    input.value = '';
  }
  dragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.saving()) this.dragging.set(true);
  }
  drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (!this.saving()) this.selectFile(event.dataTransfer?.files[0]);
  }
  selectFile(file?: File): void {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type) ||
      file.size > 15 * 1024 * 1024
    ) {
      this.error.set('archive.editor.invalidImage');
      return;
    }
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.file = file;
    this.objectUrl = URL.createObjectURL(file);
    this.preview.set(this.objectUrl);
    this.error.set('');
  }
  save(): void {
    if (this.saving()) return;
    const data = new FormData();
    for (const [key, value] of Object.entries(this.draft)) data.append(key, value.trim());
    if (this.file) data.append('file', this.file);
    this.error.set('');
    this.saving.set(true);
    this.api
      .saveArchiveCard(this.type().key, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('archive.editor.saveError');
        },
      });
  }
  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}
