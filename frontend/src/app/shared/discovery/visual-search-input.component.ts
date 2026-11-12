import {
  ChangeDetectionStrategy,
  Component,
  AfterViewInit,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { VisualReferenceService } from './visual-reference.service';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { DiscoveryImageIconComponent } from './discovery-image-icon.component';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiUrl } from '../../core/api/api-base';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppLoadingComponent } from '../ui/app-loading/app-loading.component';

@Component({
  selector: 'app-visual-search-input',
  standalone: true,
  imports: [NgTemplateOutlet, AppLoadingComponent, DiscoveryImageIconComponent],
  template: `<dialog
    #dialog
    class="visual-dialog"
    [class.color-mode]="showColors()"
    aria-labelledby="visual-search-title"
    (cancel)="cancel($event)"
    (keydown)="$event.stopPropagation()"
    (click)="backdrop($event)"
  >
    <button
      type="button"
      class="modal-close"
      (click)="close()"
      [attr.aria-label]="i18n.t('discovery.close')"
    >
      ×
    </button>
    <ng-template #heading
      ><header class="modal-heading">
        <span>{{ i18n.t(showColors() ? 'search.title' : 'discovery.reference') }}</span>
        <h2 id="visual-search-title">
          {{ i18n.t(showColors() ? 'discovery.colorTitle' : 'discovery.imageTitle') }}
        </h2>
        <p>{{ i18n.t(showColors() ? 'discovery.pickColors' : 'discovery.imageHint') }}</p>
      </header></ng-template
    >
    <ng-template #queryForm
      ><form (submit)="submit($event)">
        @if (!showColors()) {
          <label class="context-input"
            >{{ i18n.t('discovery.optionalContext')
            }}<input
              class="ds-input"
              type="search"
              [value]="text()"
              (input)="text.set($any($event.target).value)"
              [placeholder]="i18n.t('discovery.optionalText')"
          /></label>
        }
        <button class="ds-btn" type="submit" [disabled]="busy() || invalidColor()">
          {{ i18n.t(showColors() ? 'discovery.applyColors' : 'discovery.searchInJano')
          }}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
        </button>
      </form>
      @if (!showColors() || image() || preview()) {
        <p class="privacy">{{ i18n.t('discovery.privacy') }}</p>
      }
    </ng-template>
    <section class="visual-input" [attr.aria-label]="i18n.t('discovery.input')">
      <fieldset [disabled]="busy()">
        <input
          #gallery
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          hidden
          (change)="choose(gallery.files?.[0]); gallery.value = ''"
        />
        <input
          #camera
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          (change)="choose(camera.files?.[0]); camera.value = ''"
        />
        @if (showColors()) {
          <ng-container [ngTemplateOutlet]="heading" />
          <div class="color-preview" [style.background]="colors()[0] || '#254e77'"></div>
          <div class="color-picker">
            @for (color of colors(); track $index; let index = $index) {
              <label
                >{{ i18n.t('discovery.colorNumber') }} {{ index + 1
                }}<input
                  type="color"
                  [value]="color"
                  (input)="setColor(index, $any($event.target).value)"
              /></label>
              <label
                >HEX<input
                  class="hex-input"
                  type="text"
                  maxlength="7"
                  [value]="color"
                  [attr.aria-label]="'HEX ' + (index + 1)"
                  (input)="setHex(index, $any($event.target).value)"
              /></label>
              <button
                type="button"
                class="ds-btn"
                (click)="removeColor(index)"
                [attr.aria-label]="i18n.t('discovery.remove') + ' ' + color"
              >
                ×
              </button>
            }
            @if (colors().length < 2) {
              <button class="ds-btn" type="button" (click)="addColor()">
                {{ i18n.t('discovery.addColor') }}
              </button>
            }
          </div>
          <ng-container [ngTemplateOutlet]="queryForm" />
        } @else {
          <div class="image-preparation">
            <div class="reference-column">
              @if (preview()) {
                <div class="image-frame" [class.crop]="cropping()">
                  <img
                    [src]="preview()"
                    [alt]="i18n.t('discovery.reference')"
                    [style.object-position]="x() + '% ' + y() + '%'"
                  />
                </div>
                <div class="reference-tools">
                  <label
                    ><input
                      type="checkbox"
                      [checked]="cropping()"
                      (change)="cropping.set(!cropping())"
                    />{{ i18n.t('discovery.crop') }}</label
                  >
                  @if (cropping()) {
                    <label
                      >{{ i18n.t('discovery.horizontal')
                      }}<input
                        type="range"
                        min="0"
                        max="100"
                        [value]="x()"
                        (input)="x.set(+$any($event.target).value)"
                    /></label>
                    <label
                      >{{ i18n.t('discovery.vertical')
                      }}<input
                        type="range"
                        min="0"
                        max="100"
                        [value]="y()"
                        (input)="y.set(+$any($event.target).value)"
                    /></label>
                  }
                </div>
              } @else {
                <button class="image-placeholder" type="button" (click)="gallery.click()">
                  <app-discovery-image-icon /><span>{{
                    i18n.t(image() ? 'discovery.replaceImage' : 'discovery.addImage')
                  }}</span
                  ><small>JPEG · PNG · WebP · AVIF</small>
                </button>
              }
              <div class="tools">
                <button type="button" class="ds-btn" (click)="gallery.click()">
                  <app-discovery-image-icon />{{
                    i18n.t(preview() ? 'discovery.replaceImage' : 'discovery.addImage')
                  }}</button
                ><button type="button" class="ds-btn camera" (click)="camera.click()">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h4l2-3h4l2 3h4v13H4z" />
                    <circle cx="12" cy="13" r="4" /></svg
                  >{{ i18n.t('discovery.takePhoto') }}
                </button>
              </div>
              @if (preview() || image()) {
                <button class="remove-reference" type="button" (click)="remove()">
                  {{ i18n.t('discovery.removeImage') }}
                </button>
              }
            </div>
            <div class="preparation-copy">
              <ng-container [ngTemplateOutlet]="heading" /><ng-container
                [ngTemplateOutlet]="queryForm"
              />
            </div>
          </div>
        }
      </fieldset>
      @if (busy()) {
        <app-loading [label]="i18n.t('discovery.analyzing')" [skeleton]="true" />
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
    </section>
  </dialog> `,
  styles: [
    `
      :host {
        display: contents;
      }
      .visual-dialog {
        position: fixed;
        width: min(820px, calc(100vw - 48px));
        max-height: calc(100dvh - 64px);
        box-sizing: border-box;
        padding: 34px;
        border: 1px solid var(--color-border);
        border-radius: 24px;
        background: var(--color-surface-strong);
        color: var(--color-text);
        box-shadow: 0 26px 76px #0005;
        overflow: auto;
      }
      .visual-dialog::backdrop {
        background: #08080899;
        backdrop-filter: blur(10px);
      }
      .visual-dialog.color-mode {
        width: min(560px, calc(100vw - 24px));
      }
      .modal-close {
        position: absolute;
        right: 20px;
        top: 16px;
        width: 34px;
        height: 34px;
        border: 1px solid var(--color-border);
        border-radius: 50%;
        background: transparent;
        color: inherit;
        font-size: 23px;
        cursor: pointer;
      }
      .modal-heading span {
        font-size: 11px;
        letter-spacing: 0.1em;
        color: var(--color-text-muted);
      }
      .modal-heading h2 {
        font-weight: 500;
        font-size: 30px;
        line-height: 1.15;
        letter-spacing: -0.035em;
        margin: 12px 28px 12px 0;
      }
      .modal-heading p {
        font-size: 13px;
        line-height: 1.7;
        color: var(--color-text-muted);
        margin: 0 0 22px;
      }
      fieldset {
        border: 0;
        padding: 0;
        margin: 0;
        min-width: 0;
      }
      .image-preparation {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 30px;
      }
      .reference-column {
        min-width: 0;
      }
      .preparation-copy {
        align-self: center;
      }
      .preparation-copy .modal-heading h2 {
        margin-right: 0;
      }
      .image-frame {
        width: 100%;
        height: 290px;
        box-sizing: border-box;
        border-radius: 16px;
        overflow: hidden;
        background: var(--color-surface);
      }
      .image-frame.crop {
        aspect-ratio: 1;
        height: auto;
      }
      .image-frame img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
      .crop img {
        object-fit: cover;
      }
      .crop {
        outline: 1px solid var(--color-text);
        outline-offset: 3px;
      }
      .image-placeholder {
        display: flex;
        width: 100%;
        height: 290px;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 18px;
        border: 1px dashed var(--color-border);
        border-radius: 16px;
        background: var(--color-surface);
        color: var(--color-text);
        cursor: pointer;
        font: inherit;
        font-size: 14px;
      }
      .image-placeholder small {
        font-size: 11px;
        color: var(--color-text-muted);
      }
      .reference-tools {
        display: grid;
        gap: 10px;
        margin: 18px 0;
        font-size: 12px;
      }
      .reference-tools label {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .reference-tools input[type='range'] {
        flex: 1;
        min-width: 0;
      }
      .tools {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 18px;
      }
      .ds-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 24px;
        min-height: 42px;
        padding: 8px 14px;
      }
      .tools svg,
      form button svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.35;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .remove-reference {
        font: inherit;
        font-size: 11px;
        color: var(--color-text-muted);
        border: 0;
        background: transparent;
        padding: 12px 0 0;
        cursor: pointer;
      }
      form {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      .preparation-copy form {
        flex-direction: column;
        align-items: flex-start;
        gap: 18px;
      }
      .context-input {
        display: grid;
        gap: 8px;
        width: 100%;
        font-size: 12px;
        color: var(--color-text-muted);
      }
      .context-input input {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        font-size: 13px;
        border-radius: 12px;
      }
      form button.ds-btn {
        background: var(--color-text);
        color: var(--color-surface-strong);
        border: 0;
      }
      .color-preview {
        height: 135px;
        border-radius: 14px;
        margin: 20px 0;
      }
      .color-picker {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        padding: 16px 0;
        font-size: 12px;
      }
      .color-picker label {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .color-picker input[type='color'] {
        width: 64px;
        height: 52px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: none;
        padding: 3px;
        cursor: pointer;
      }
      .hex-input {
        width: 94px;
        box-sizing: border-box;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 12px;
        background: var(--color-surface);
        color: var(--color-text);
        font: inherit;
      }
      .privacy {
        font-size: 11px;
        line-height: 1.65;
        color: var(--color-text-muted);
        margin: 12px 0 0;
      }
      [role='alert'] {
        font-size: 12px;
        line-height: 1.65;
        color: var(--color-text);
      }
      button:focus-visible,
      input:focus-visible {
        outline: 2px solid var(--color-text-muted);
        outline-offset: 3px;
      }
      @media (min-width: 900px) and (hover: hover) and (pointer: fine) {
        .camera {
          display: none;
        }
      }
      @media (max-width: 600px) {
        .visual-dialog {
          padding: 26px 20px;
          width: calc(100vw - 24px);
          max-height: calc(100dvh - 24px);
        }
        .image-preparation {
          grid-template-columns: 1fr;
          gap: 24px;
        }
        .image-frame,
        .image-placeholder {
          height: 240px;
        }
        .image-frame.crop {
          height: auto;
        }
        .modal-heading h2 {
          font-size: 26px;
        }
        .visual-dialog input {
          font-size: 16px;
        }
        .tools .ds-btn {
          font-size: 12px;
          padding: 8px 10px;
        }
        .color-picker {
          gap: 8px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualSearchInputComponent implements AfterViewInit {
  @ViewChild('dialog') private dialog?: ElementRef<HTMLDialogElement>;
  private platform = inject(PLATFORM_ID);
  private mode: string | null = null;
  ngAfterViewInit() {
    this.syncDialog();
  }
  private syncDialog() {
    if (!isPlatformBrowser(this.platform) || !this.dialog) return;
    const dialog = this.dialog.nativeElement;
    if (this.mode && !dialog.open) dialog.showModal();
    else if (!this.mode && dialog.open) dialog.close();
  }
  cancel(event: Event) {
    event.preventDefault();
    void this.close();
  }
  backdrop(event: MouseEvent) {
    if (event.target !== this.dialog?.nativeElement) return;
    const r = this.dialog.nativeElement.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      void this.close();
  }
  private discardDraft() {
    this.controller?.abort();
    if (this.file) {
      if (this.preview() && this.preview() !== this.appliedPreview())
        URL.revokeObjectURL(this.preview());
      this.file = undefined;
      this.preview.set(this.appliedPreview());
    }
    this.invalidHex.clear();
    this.invalidColor.set(false);
    this.error.set('');
  }
  close() {
    this.discardDraft();
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  readonly i18n = inject(I18nService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy = inject(DestroyRef);
  readonly preview = signal('');
  readonly appliedPreview = inject(VisualReferenceService).preview;
  private invalidHex = new Set<number>();
  readonly image = signal('');
  readonly text = signal('');
  readonly colors = signal<string[]>([]);
  readonly showColors = signal(false);
  readonly cropping = signal(false);
  readonly x = signal(50);
  readonly y = signal(50);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly invalidColor = signal(false);
  private appliedCriteria = '';
  private file?: File;
  private controller?: AbortController;
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const previousMode = this.mode;
      this.mode = ['image', 'color'].includes(params.get('mode') ?? '') ? params.get('mode') : null;
      if (previousMode && !this.mode) this.discardDraft();
      this.showColors.set(this.mode === 'color');
      this.syncDialog();
      const criteria = JSON.stringify(
        ['q', 'image', 'colors', 'mode'].map((key) => params.get(key)),
      );
      if (criteria === this.appliedCriteria) return;
      this.appliedCriteria = criteria;
      this.text.set(params.get('q') ?? '');
      this.image.set(params.get('image') ?? '');
      this.colors.set(
        (params.get('colors') ?? '').split(',').filter((c) => /^#[a-f0-9]{6}$/i.test(c)),
      );
      if (this.mode === 'color') {
        this.showColors.set(true);
        if (!this.colors().length) this.colors.set(['#254e77']);
      }
    });
    this.destroy.onDestroy(() => {
      this.controller?.abort();
      if (this.preview()) URL.revokeObjectURL(this.preview());
      if (this.appliedPreview() && this.appliedPreview() !== this.preview())
        URL.revokeObjectURL(this.appliedPreview());
    });
  }
  choose(file?: File) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      this.error.set(this.i18n.t('discovery.fileError'));
      return;
    }
    if (this.preview() && this.preview() !== this.appliedPreview())
      URL.revokeObjectURL(this.preview());
    this.file = file;
    this.preview.set(URL.createObjectURL(file));
    this.cropping.set(false);
    this.error.set('');
  }
  addColor() {
    this.colors.update((colors) => [...colors, '#477ba6']);
  }
  setHex(index: number, value: string) {
    const valid = /^#[a-f0-9]{6}$/i.test(value);
    if (!valid) {
      this.invalidHex.add(index);
      this.invalidColor.set(true);
      this.error.set(this.i18n.t('discovery.hexError'));
    } else this.setColor(index, value);
  }
  setColor(index: number, color: string) {
    this.invalidHex.delete(index);
    this.invalidColor.set(!!this.invalidHex.size);
    if (!this.invalidHex.size) this.error.set('');
    this.colors.update((colors) => colors.map((v, i) => (i === index ? color : v)));
  }
  removeColor(index: number) {
    this.invalidHex.clear();
    this.invalidColor.set(false);
    this.error.set('');
    this.colors.update((colors) => colors.filter((_, i) => i !== index));
  }
  async remove() {
    const id = this.image();
    if (id)
      this.http
        .delete(apiUrl('/search/images'), { params: { image: id } })
        .subscribe({ error: () => {} });
    this.file = undefined;
    if (this.preview()) URL.revokeObjectURL(this.preview());
    if (this.appliedPreview() && this.appliedPreview() !== this.preview())
      URL.revokeObjectURL(this.appliedPreview());
    this.appliedPreview.set('');
    this.preview.set('');
    this.image.set('');
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { image: null },
      queryParamsHandling: 'merge',
    });
  }
  async submit(event: Event) {
    event.preventDefault();
    if (this.busy() || this.invalidColor()) return;
    this.error.set('');
    this.busy.set(true);
    try {
      let id = this.image();
      if (this.file) {
        let file: Blob = this.file;
        if (this.cropping()) {
          const bitmap = await createImageBitmap(this.file, { imageOrientation: 'from-image' });
          try {
            const size = Math.min(bitmap.width, bitmap.height);
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = Math.min(size, 1024);
            canvas
              .getContext('2d')!
              .drawImage(
                bitmap,
                ((bitmap.width - size) * this.x()) / 100,
                ((bitmap.height - size) * this.y()) / 100,
                size,
                size,
                0,
                0,
                canvas.width,
                canvas.height,
              );
            file = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error())),
                'image/jpeg',
                0.9,
              ),
            );
          } finally {
            bitmap.close();
          }
        }
        const body = new FormData();
        body.append('image', file, 'reference.jpg');
        this.controller = new AbortController();
        const response = await fetch(apiUrl('/search/images'), {
          method: 'POST',
          body,
          credentials: 'same-origin',
          signal: this.controller.signal,
        });
        if (!response.ok) throw new Error();
        const result = (await response.json()) as { id: string };
        id = result.id;
        this.image.set(id);
        if (this.appliedPreview() && this.appliedPreview() !== this.preview())
          URL.revokeObjectURL(this.appliedPreview());
        this.appliedPreview.set(this.preview());
        this.file = undefined;
      }
      await this.router.navigate(['/search'], {
        queryParams: {
          q: this.text().trim() || null,
          image: id || null,
          colors: this.colors().join(',') || null,
          mode: null,
          page: 1,
        },
        queryParamsHandling: 'merge',
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      this.error.set(this.i18n.t('discovery.imageError'));
    } finally {
      this.busy.set(false);
    }
  }
}
