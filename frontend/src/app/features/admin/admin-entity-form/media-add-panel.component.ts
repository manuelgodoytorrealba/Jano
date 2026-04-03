import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import {
  MEDIA_ADD_ROLE_OPTIONS,
  MEDIA_DISPLAY_MODES,
  MEDIA_ROLE_LABELS,
  MediaAddExternalSubmit,
  MediaAddUploadSubmit,
  MediaDraft,
  UploadPreviewDimensions,
} from './media-admin.models';

const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

@Component({
  standalone: true,
  selector: 'app-media-add-panel',
  imports: [FormsModule, JanoMediaComponent],
  templateUrl: './media-add-panel.component.html',
  styleUrls: ['./media-add-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaAddPanelComponent implements OnChanges, OnDestroy {
  @Input() adding = false;
  @Input() uploading = false;
  @Input() resetVersion = 0;

  @Output() addExternal = new EventEmitter<MediaAddExternalSubmit>();
  @Output() addUpload = new EventEmitter<MediaAddUploadSubmit>();

  mode: 'url' | 'upload' = 'url';
  showAdvanced = false;

  externalDraft = this.createEmptyDraft();
  uploadDraft = this.createEmptyDraft();

  uploadDragActive = false;
  uploadValidationError = '';
  uploadPreviewUrl: string | null = null;
  uploadPreviewDimensions: UploadPreviewDimensions | null = null;
  selectedUploadFile: File | null = null;

  private initialized = false;

  readonly roleOptions = MEDIA_ADD_ROLE_OPTIONS;
  readonly roleLabels = MEDIA_ROLE_LABELS;
  readonly displayModes = MEDIA_DISPLAY_MODES;

  ngOnChanges(changes: SimpleChanges) {
    if (!this.initialized) {
      this.initialized = true;
      return;
    }

    if (changes['resetVersion']) {
      this.reset();
    }
  }

  ngOnDestroy() {
    this.releasePreviewUrl();
  }

  get submitDisabled(): boolean {
    if (this.mode === 'url') {
      return this.adding || !this.externalDraft.url.trim();
    }

    return this.uploading || !this.selectedUploadFile || !!this.uploadValidationError;
  }

  get submitLabel(): string {
    if (this.mode === 'url') {
      return this.adding ? 'Añadiendo...' : 'Añadir imagen';
    }

    return this.uploading ? 'Añadiendo...' : 'Añadir imagen';
  }

  get uploadAcceptedFormatsLabel(): string {
    return 'JPEG, PNG, WEBP, GIF o AVIF';
  }

  get maxUploadSizeLabel(): string {
    return this.formatFileSize(MAX_UPLOAD_SIZE_BYTES);
  }

  get externalPreviewMedia() {
    const url = this.externalDraft.displayUrl.trim() || this.externalDraft.url.trim();
    if (!url) {
      return null;
    }

    return {
      url: this.externalDraft.url.trim() || url,
      displayUrl: this.externalDraft.displayUrl.trim() || null,
      alt: this.externalDraft.alt.trim() || null,
      originType: 'EXTERNAL_URL',
    };
  }

  setMode(mode: 'url' | 'upload') {
    this.mode = mode;
  }

  toggleAdvanced() {
    this.showAdvanced = !this.showAdvanced;
  }

  submit() {
    if (this.mode === 'url') {
      if (this.submitDisabled) {
        return;
      }

      this.addExternal.emit({
        draft: { ...this.externalDraft },
      });
      return;
    }

    if (this.submitDisabled || !this.selectedUploadFile) {
      return;
    }

    this.addUpload.emit({
      draft: { ...this.uploadDraft },
      file: this.selectedUploadFile,
      dimensions: this.uploadPreviewDimensions,
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.setUploadFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.uploadDragActive = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.uploadDragActive = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.uploadDragActive = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.setUploadFile(file);
  }

  clearSelectedUpload() {
    this.setUploadFile(null);
  }

  mediaRoleLabel(role: string | null | undefined): string {
    return this.roleLabels[role ?? ''] ?? role ?? '—';
  }

  formatFileSize(value: number | null | undefined): string {
    if (!value || value <= 0) {
      return '—';
    }

    if (value >= 1024 * 1024) {
      return `${(value / 1024 / 1024).toFixed(2)} MB`;
    }

    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  private createEmptyDraft(): MediaDraft {
    return {
      url: '',
      displayUrl: '',
      sourcePageUrl: '',
      alt: '',
      source: '',
      photoBy: '',
      license: '',
      role: 'CARD',
      sortOrder: 0,
      isPrimary: false,
      displayMode: '',
      focalX: null,
      focalY: null,
    };
  }

  private reset() {
    this.mode = 'url';
    this.showAdvanced = false;
    this.externalDraft = this.createEmptyDraft();
    this.uploadDraft = this.createEmptyDraft();
    this.uploadValidationError = '';
    this.uploadDragActive = false;
    this.selectedUploadFile = null;
    this.uploadPreviewDimensions = null;
    this.releasePreviewUrl();
  }

  private setUploadFile(file: File | null) {
    this.uploadValidationError = '';
    this.uploadDragActive = false;
    this.releasePreviewUrl();
    this.uploadPreviewDimensions = null;
    this.selectedUploadFile = file;

    if (!file) {
      return;
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
      this.selectedUploadFile = null;
      this.uploadValidationError = `Formato no permitido. Usa ${this.uploadAcceptedFormatsLabel}.`;
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      this.selectedUploadFile = null;
      this.uploadValidationError = `El archivo supera el máximo permitido de ${this.maxUploadSizeLabel}.`;
      return;
    }

    this.uploadPreviewUrl = URL.createObjectURL(file);
    this.readUploadPreviewDimensions(this.uploadPreviewUrl);
  }

  private releasePreviewUrl() {
    if (this.uploadPreviewUrl) {
      URL.revokeObjectURL(this.uploadPreviewUrl);
      this.uploadPreviewUrl = null;
    }
  }

  private readUploadPreviewDimensions(objectUrl: string) {
    const image = new Image();

    image.onload = () => {
      this.uploadPreviewDimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
    };

    image.onerror = () => {
      this.uploadPreviewDimensions = null;
    };

    image.src = objectUrl;
  }
}
