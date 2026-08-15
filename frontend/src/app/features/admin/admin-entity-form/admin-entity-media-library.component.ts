import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
} from '@angular/core';
import {
  AdminAdditionalMediaItem,
  AdminMediaCoverageSummary,
  AdminMediaWarning,
} from '../../../core/api/admin-entities.api';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { AdminEntityMediaGroupComponent } from './admin-entity-media-group.component';
import {
  AdminEntityMediaEditorPresentation,
  AdminEntityMediaLibraryViewModel,
  MediaLibraryViewId,
  VisualSlot,
  buildAdminEntityMediaLibraryViewModel,
  mediaSlotResolutionLabel,
  mediaSlotStateClass,
  mediaSlotStatusLabel,
} from './admin-entity-media.presenter';
import { MediaAddPanelComponent } from './media-add-panel.component';
import {
  EditableAdminMediaEditor,
  EditableAdminMediaLink,
  MEDIA_ROLE_LABELS,
  MediaAddExternalSubmit,
  MediaAddUploadSubmit,
} from './media-admin.models';
import { MediaCardEditorComponent } from './media-card-editor.component';
import {
  AdminEntityMediaActions,
  AdminEntityMediaActionsSnapshot,
} from './admin-entity-media.actions';

export type AdminEntityMediaLibraryIntent =
  | { type: 'addExternal'; event: MediaAddExternalSubmit }
  | { type: 'upload'; event: MediaAddUploadSubmit }
  | { type: 'draftChange'; draft: EditableAdminMediaLink }
  | { type: 'assignRole'; link: EditableAdminMediaLink; role: string }
  | {
      type: 'toggleLegacy' | 'save' | 'discard' | 'remove' | 'ingest' | 'promote' | 'restore';
      link: EditableAdminMediaLink;
    };

@Component({
  standalone: true,
  selector: 'app-admin-entity-media-library',
  imports: [
    JanoMediaComponent,
    AdminEntityMediaGroupComponent,
    MediaAddPanelComponent,
    MediaCardEditorComponent,
  ],
  templateUrl: './admin-entity-media-library.component.html',
  styleUrls: ['./admin-entity-media-library.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AdminEntityMediaActions],
})
export class AdminEntityMediaLibraryComponent implements OnChanges {
  private readonly actions = inject(AdminEntityMediaActions);
  @Input() isEdit = false;
  @Input() entityTitle = '';
  @Input() mediaEditors: EditableAdminMediaEditor[] = [];
  @Input() persistedMediaLinks: EditableAdminMediaLink[] = [];
  @Input() resolvedVisualSlots: VisualSlot[] = [];
  @Input() additionalMediaItems: AdminAdditionalMediaItem[] = [];
  @Input() mediaWarningsDetailed: AdminMediaWarning[] = [];
  @Input() mediaWarningMessages: string[] = [];
  @Input() mediaCoverageSummary: AdminMediaCoverageSummary | null = null;
  @Input() persistedResolvedMedia: Record<string, unknown> | null = null;
  @Input() initialActiveEditorId: string | null = null;
  @Input() adding = false;
  @Input() uploading = false;
  @Input() addResetVersion = 0;
  @Input() message = '';
  @Input() error = '';

  @Output() stateChange = new EventEmitter<AdminEntityMediaActionsSnapshot>();

  readonly views = [
    { id: 'library' as const, label: 'Imágenes' },
    { id: 'add' as const, label: 'Añadir imagen' },
    { id: 'coverage' as const, label: 'Comprobación' },
  ];
  activeView: MediaLibraryViewId = 'library';
  activeEditorId: string | null = null;
  emptyDropActive = false;
  droppedUploadFile: File | null = null;
  model: AdminEntityMediaLibraryViewModel = this.buildModel();

  constructor() {
    this.actions.changes.subscribe((snapshot) => {
      this.mediaEditors = snapshot.state.mediaEditors;
      this.persistedMediaLinks = snapshot.state.persistedMediaLinks;
      this.resolvedVisualSlots = snapshot.state.resolvedVisualSlots;
      this.additionalMediaItems = snapshot.state.additionalMediaItems;
      this.mediaWarningsDetailed = snapshot.state.mediaWarningsDetailed;
      this.mediaWarningMessages = snapshot.state.mediaWarningMessages;
      this.mediaCoverageSummary = snapshot.state.mediaCoverageSummary;
      this.adding = snapshot.adding;
      this.uploading = snapshot.uploading;
      this.addResetVersion = snapshot.resetVersion;
      this.message = snapshot.message;
      this.error = snapshot.error;
      this.rebuildModel();
      this.stateChange.emit(snapshot);
    });
  }

  ngOnChanges(): void {
    if (!this.activeEditorId && this.initialActiveEditorId) {
      this.activeEditorId = this.initialActiveEditorId;
    }
    this.actions.hydrate(this.entityId, this.snapshot());
    this.rebuildModel();
  }

  @Input() entityId = '';

  setView(view: MediaLibraryViewId): void {
    this.activeView = view;
    this.actions.setVisualState(this.activeEditorId, view);
  }

  onEmptyMediaDragOver(event: DragEvent): void {
    event.preventDefault();
    this.emptyDropActive = true;
  }

  onEmptyMediaDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.emptyDropActive = false;
  }

  onEmptyMediaDrop(event: DragEvent): void {
    event.preventDefault();
    this.emptyDropActive = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    this.setView('add');
    this.droppedUploadFile = file;
    setTimeout(() => (this.droppedUploadFile = null));
  }

  selectEditor(linkOrId: EditableAdminMediaLink | string): void {
    this.activeEditorId = typeof linkOrId === 'string' ? linkOrId : linkOrId.id;
    this.actions.setVisualState(this.activeEditorId, this.activeView);
    this.rebuildModel();
  }

  viewClass(view: MediaLibraryViewId): string {
    return `admin-dashboard-nav__item media-library-nav__item${this.activeView === view ? ' is-active' : ''}`;
  }

  mediaRoleLabel(role: string | null | undefined): string {
    return MEDIA_ROLE_LABELS[role ?? ''] ?? role ?? '—';
  }

  mediaOriginLabel(originType: string | null | undefined): string {
    if (originType === 'UPLOAD') return 'Uploaded file';
    if (originType === 'INGESTED') return 'Ingested asset';
    return 'External URL';
  }

  slotStatusLabel(slot: VisualSlot): string {
    return mediaSlotStatusLabel(slot, (role) => this.mediaRoleLabel(role));
  }

  slotResolutionLabel(slot: VisualSlot): string {
    return mediaSlotResolutionLabel(slot);
  }

  slotStateClass(slot: VisualSlot): string {
    return mediaSlotStateClass(slot);
  }

  presentation(link: EditableAdminMediaLink): AdminEntityMediaEditorPresentation {
    return this.model.editorMetaById[link.id] ?? this.emptyPresentation();
  }

  emitLinkIntent(
    type: Extract<AdminEntityMediaLibraryIntent, { link: EditableAdminMediaLink }>['type'],
    link: EditableAdminMediaLink,
  ): void {
    this.dispatch({ type, link } as AdminEntityMediaLibraryIntent);
  }

  dispatch(intent: AdminEntityMediaLibraryIntent): void {
    this.actions.handle(intent);
  }

  readonly presentationFor = (link: EditableAdminMediaLink) => this.presentation(link);
  readonly hasPersistedLegacyFor = (editorId: string) =>
    this.persistedMediaLinks.some((link) => link.isPrimary && link.id !== editorId);

  private rebuildModel(): void {
    this.model = this.buildModel();
    if (this.activeEditorId && !this.model.activeMediaEditor) {
      this.activeEditorId = null;
      this.model = this.buildModel();
    }
  }

  private buildModel(): AdminEntityMediaLibraryViewModel {
    return buildAdminEntityMediaLibraryViewModel({
      mediaEditors: this.mediaEditors,
      persistedMediaLinks: this.persistedMediaLinks,
      resolvedVisualSlots: this.resolvedVisualSlots,
      additionalMediaItems: this.additionalMediaItems,
      mediaWarningsDetailed: this.mediaWarningsDetailed,
      mediaWarningMessages: this.mediaWarningMessages,
      mediaCoverageSummary: this.mediaCoverageSummary,
      activeMediaEditorId: this.activeEditorId,
      mediaRoleLabel: (role) => this.mediaRoleLabel(role),
    });
  }

  private emptyPresentation(): AdminEntityMediaEditorPresentation {
    return {
      activeSlotLabels: [],
      canIngest: false,
      canPromote: false,
      canRestore: false,
      hasPromotedReplacement: false,
      replacementTargetLabel: null,
      replacementIngestedLabel: null,
      ingestedSourceLabel: null,
      slotWarnings: {},
    };
  }

  private snapshot(): AdminEntityMediaActionsSnapshot {
    return {
      state: {
        persistedMediaLinks: this.persistedMediaLinks,
        mediaEditors: this.mediaEditors,
        resolvedVisualSlots: this.resolvedVisualSlots,
        additionalMediaItems: this.additionalMediaItems,
        mediaWarningsDetailed: this.mediaWarningsDetailed,
        mediaWarningMessages: this.mediaWarningMessages,
        mediaCoverageSummary: this.mediaCoverageSummary,
        activeMediaEditorId: this.activeEditorId,
        activeMediaLibraryView: this.activeView,
      },
      persistedResolvedMedia: this.persistedResolvedMedia,
      adding: this.adding,
      uploading: this.uploading,
      resetVersion: this.addResetVersion,
      message: this.message,
      error: this.error,
    };
  }
}
