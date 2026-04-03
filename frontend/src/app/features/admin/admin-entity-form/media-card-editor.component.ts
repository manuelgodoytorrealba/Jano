import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { EditableAdminMediaLink, MEDIA_DISPLAY_MODES, MEDIA_ROLE_LABELS, MEDIA_ROLE_OPTIONS } from './media-admin.models';

@Component({
  standalone: true,
  selector: 'app-media-card-editor',
  imports: [FormsModule, JanoMediaComponent],
  templateUrl: './media-card-editor.component.html',
  styleUrls: ['./media-card-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaCardEditorComponent {
  @Input({ required: true }) link!: EditableAdminMediaLink;
  @Input() entityTitle = '';
  @Input() activeSlotLabels: string[] = [];
  @Input() canIngest = false;
  @Input() canPromote = false;
  @Input() canRestore = false;
  @Input() hasPromotedReplacement = false;
  @Input() replacementTargetLabel: string | null = null;
  @Input() replacementIngestedLabel: string | null = null;
  @Input() ingestedSourceLabel: string | null = null;

  @Output() assignRole = new EventEmitter<{ link: EditableAdminMediaLink; role: string }>();
  @Output() save = new EventEmitter<EditableAdminMediaLink>();
  @Output() remove = new EventEmitter<EditableAdminMediaLink>();
  @Output() ingest = new EventEmitter<EditableAdminMediaLink>();
  @Output() promote = new EventEmitter<EditableAdminMediaLink>();
  @Output() restore = new EventEmitter<EditableAdminMediaLink>();

  showAdvanced = false;

  readonly mediaRoles = MEDIA_ROLE_OPTIONS;
  readonly displayModes = MEDIA_DISPLAY_MODES;
  readonly roleLabels = MEDIA_ROLE_LABELS;

  get previewMedia() {
    return {
      ...this.link.media,
      displayMode: this.link.displayMode || null,
      focalX: this.toNullableNumber(this.link.focalX),
      focalY: this.toNullableNumber(this.link.focalY),
    };
  }

  mediaRoleLabel(role: string | null | undefined): string {
    return this.roleLabels[role ?? ''] ?? role ?? '—';
  }

  mediaOriginLabel(originType: string | null | undefined): string {
    switch (originType) {
      case 'UPLOAD':
        return 'Upload';
      case 'INGESTED':
        return 'Ingested';
      case 'EXTERNAL_URL':
      default:
        return 'External';
    }
  }

  mediaOriginDescription(originType: string | null | undefined): string {
    switch (originType) {
      case 'UPLOAD':
        return 'Asset propio en storage local de JANO.';
      case 'INGESTED':
        return 'Asset propio derivado de una referencia externa.';
      case 'EXTERNAL_URL':
      default:
        return 'Referencia remota que aun no vive en JANO.';
    }
  }

  mediaOriginTone(originType: string | null | undefined): string {
    switch (originType) {
      case 'UPLOAD':
        return 'media-pill--upload';
      case 'INGESTED':
        return 'media-pill--ingested';
      case 'EXTERNAL_URL':
      default:
        return 'media-pill--external';
    }
  }

  toggleAdvanced() {
    this.showAdvanced = !this.showAdvanced;
  }

  setRole(role: string) {
    if (this.link.role === role) {
      return;
    }

    this.assignRole.emit({ link: this.link, role });
  }

  saveChanges() {
    this.save.emit(this.link);
  }

  removeLink() {
    this.remove.emit(this.link);
  }

  ingestLink() {
    this.ingest.emit(this.link);
  }

  promoteLink() {
    this.promote.emit(this.link);
  }

  restoreLink() {
    this.restore.emit(this.link);
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

  private toNullableNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}
