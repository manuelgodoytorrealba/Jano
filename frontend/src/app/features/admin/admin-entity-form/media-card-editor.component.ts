import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import {
  EditableAdminMediaEditor,
  EditableAdminMediaLink,
  MEDIA_DISPLAY_MODES,
  MEDIA_EDITOR_SLOT_OPTIONS,
  MEDIA_PRIMARY_ROLE_PILLS,
  MEDIA_ROLE_LABELS,
  MEDIA_ROLE_OPTIONS,
  MEDIA_SECONDARY_ROLE_PILLS,
  MediaEditorSlotKey,
} from './media-admin.models';

@Component({
  standalone: true,
  selector: 'app-media-card-editor',
  imports: [FormsModule, JanoMediaComponent],
  templateUrl: './media-card-editor.component.html',
  styleUrls: ['./media-card-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaCardEditorComponent implements OnChanges {
  @Input({ required: true }) editor!: EditableAdminMediaEditor;
  @Input() entityTitle = '';
  @Input() activeSlotLabels: string[] = [];
  @Input() compact = false;
  @Input() selected = false;
  @Input() forceAdvanced = false;
  @Input() panel = false;
  @Input() canIngest = false;
  @Input() canPromote = false;
  @Input() canRestore = false;
  @Input() hasAnyPersistedLegacy = false;
  @Input() hasPromotedReplacement = false;
  @Input() replacementTargetLabel: string | null = null;
  @Input() replacementIngestedLabel: string | null = null;
  @Input() ingestedSourceLabel: string | null = null;
  @Input() slotWarnings: Partial<Record<MediaEditorSlotKey, string[]>> = {};

  @Output() assignRole = new EventEmitter<{ link: EditableAdminMediaLink; role: string }>();
  @Output() toggleLegacy = new EventEmitter<EditableAdminMediaLink>();
  @Output() save = new EventEmitter<EditableAdminMediaLink>();
  @Output() discard = new EventEmitter<EditableAdminMediaLink>();
  @Output() remove = new EventEmitter<EditableAdminMediaLink>();
  @Output() ingest = new EventEmitter<EditableAdminMediaLink>();
  @Output() promote = new EventEmitter<EditableAdminMediaLink>();
  @Output() restore = new EventEmitter<EditableAdminMediaLink>();
  @Output() editRequested = new EventEmitter<EditableAdminMediaLink>();

  showAdvanced = false;
  activeEditorSlot: MediaEditorSlotKey = 'detail';
  compositionOpen = false;
  previewsOpen = false;
  metadataOpen = false;
  precisionOpen = false;
  private dragTarget: 'asset' | 'slot' | null = null;
  private dragSurface: HTMLElement | null = null;
  private dragPointerId: number | null = null;
  private lastEditorId: string | null = null;

  readonly mediaRoles = MEDIA_ROLE_OPTIONS;
  readonly displayModes = MEDIA_DISPLAY_MODES;
  readonly roleLabels = MEDIA_ROLE_LABELS;
  readonly primaryRolePills = MEDIA_PRIMARY_ROLE_PILLS;
  readonly secondaryRolePills = MEDIA_SECONDARY_ROLE_PILLS;
  readonly editorSlotOptions = MEDIA_EDITOR_SLOT_OPTIONS;

  get draft(): EditableAdminMediaLink {
    return this.editor.draft;
  }

  get persisted(): EditableAdminMediaLink {
    return this.editor.persisted;
  }

  get previewMedia() {
    return {
      ...this.draft.media,
      displayMode: this.draft.displayMode || null,
      focalX: this.toNullableNumber(this.draft.focalX),
      focalY: this.toNullableNumber(this.draft.focalY),
      assetFocalX: this.toNullableNumber(this.draft.assetFocalX),
      assetFocalY: this.toNullableNumber(this.draft.assetFocalY),
    };
  }

  get activeSlotCrop() {
    return this.draft.slotCrops[this.activeEditorSlot];
  }

  get cropPreviewMedia() {
    const crop = this.activeSlotCrop;
    return {
      ...this.previewMedia,
      focalX: this.toNullableNumber(crop?.x) ?? this.toNullableNumber(this.draft.assetFocalX) ?? this.toNullableNumber(this.draft.focalX),
      focalY: this.toNullableNumber(crop?.y) ?? this.toNullableNumber(this.draft.assetFocalY) ?? this.toNullableNumber(this.draft.focalY),
      cropX: this.toNullableNumber(crop?.x),
      cropY: this.toNullableNumber(crop?.y),
      cropZoom: this.toNullableNumber(crop?.zoom),
    };
  }

  slotPreviewMedia(slot: MediaEditorSlotKey) {
    const crop = this.draft.slotCrops[slot];
    return {
      ...this.previewMedia,
      focalX: this.toNullableNumber(crop?.x) ?? this.toNullableNumber(this.draft.assetFocalX) ?? this.toNullableNumber(this.draft.focalX),
      focalY: this.toNullableNumber(crop?.y) ?? this.toNullableNumber(this.draft.assetFocalY) ?? this.toNullableNumber(this.draft.focalY),
      cropX: this.toNullableNumber(crop?.x),
      cropY: this.toNullableNumber(crop?.y),
      cropZoom: this.toNullableNumber(crop?.zoom),
    };
  }

  slotUsage(slot: MediaEditorSlotKey): 'explorer3d' | 'card' | 'detail' | 'thumbnail' {
    switch (slot) {
      case 'explorer3d':
        return 'explorer3d';
      case 'list':
        return 'card';
      case 'preview':
        return 'thumbnail';
      case 'detail':
      default:
        return 'detail';
    }
  }

  get canEditSourceUrls(): boolean {
    return this.draft.media.originType === 'EXTERNAL_URL';
  }

  get hasDraftChanges(): boolean {
    return JSON.stringify(this.persisted) !== JSON.stringify(this.draft);
  }

  get saving(): boolean {
    return this.editor.saveState === 'saving';
  }

  get advancedVisible(): boolean {
    return this.forceAdvanced || this.showAdvanced;
  }

  get saved(): boolean {
    return this.editor.saveState === 'saved';
  }

  get draggingAsset(): boolean {
    return this.dragTarget === 'asset';
  }

  get draggingSlot(): boolean {
    return this.dragTarget === 'slot';
  }

  get activeSlotWarnings(): string[] {
    return this.slotWarnings[this.activeEditorSlot] ?? [];
  }

  get slotViewportLabel(): string {
    return this.editorSlotOptions.find((slot) => slot.key === this.activeEditorSlot)?.label ?? 'Slot';
  }

  get saveStateLabel(): string {
    if (this.saving) {
      return 'Guardando...';
    }

    if (this.hasDraftChanges) {
      return 'Listo para guardar';
    }

    return 'Sin cambios';
  }

  get warningCount(): number {
    return Object.values(this.slotWarnings).reduce((total, items) => total + (items?.length ?? 0), 0);
  }

  get currentRoleLabel(): string {
    return this.mediaRoleLabel(this.draft.role);
  }

  get compactRoleSummary(): string {
    if (this.activeSlotLabels.length) {
      return `Activa en ${this.activeSlotLabels.join(', ')}`;
    }

    if (this.draft.role === 'GALLERY') {
      return 'Material adicional';
    }

    if (this.draft.isPrimary) {
      return 'Fallback legacy';
    }

    return this.currentRoleLabel;
  }

  get compactActionLabel(): string {
    return this.selected ? 'Activa' : 'Seleccionar';
  }

  get compactMetaLabel(): string {
    if (this.activeSlotLabels.length) {
      return this.activeSlotLabels.join(' · ');
    }

    if (this.draft.media.width || this.draft.media.height) {
      return `${this.draft.media.width ?? '—'}×${this.draft.media.height ?? '—'}`;
    }

    return this.currentRoleLabel;
  }

  get isLocalAsset(): boolean {
    return this.draft.media.originType === 'UPLOAD' || this.draft.media.originType === 'INGESTED';
  }

  get assetLocationLabel(): string {
    if (this.draft.media.originType === 'UPLOAD') {
      return 'Archivo local en JANO';
    }

    if (this.draft.media.originType === 'INGESTED') {
      return 'Derivado guardado en JANO';
    }

    return 'Referencia externa';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['editor']) {
      this.syncActiveEditorSlot();
    }
  }

  get legacyStatusLabel(): string {
    if (this.draft.isPrimary && this.persisted.isPrimary) {
      return 'Fallback legacy activa';
    }

    if (this.draft.isPrimary) {
      return this.hasAnyPersistedLegacy
        ? 'Al guardar sustituirá la fallback legacy actual.'
        : 'Al guardar quedará como fallback legacy única.';
    }

    if (this.persisted.isPrimary) {
      return 'Al guardar dejará de actuar como fallback legacy.';
    }

    return this.hasAnyPersistedLegacy
      ? 'Ya existe otra fallback legacy activa.'
      : 'No hay fallback legacy activa.';
  }

  get pendingIntentLabel(): string | null {
    if (!this.hasDraftChanges) {
      return null;
    }

    const roleChanged = this.persisted.role !== this.draft.role;
    const fallbackChanged = !!this.persisted.isPrimary !== !!this.draft.isPrimary;

    if (roleChanged) {
      return `Al guardar pasará a ${this.mediaRoleLabel(this.draft.role)}.`;
    }

    if (fallbackChanged) {
      return this.draft.isPrimary
        ? 'Al guardar quedará como fallback legacy.'
        : 'Al guardar dejará de actuar como fallback legacy.';
    }

    return 'Hay cambios pendientes en texto o encuadre.';
  }

  mediaRoleLabel(role: string | null | undefined): string {
    return this.roleLabels[role ?? ''] ?? role ?? '—';
  }

  mediaOriginLabel(originType: string | null | undefined): string {
    switch (originType) {
      case 'UPLOAD':
        return 'Propio';
      case 'INGESTED':
        return 'Propio derivado';
      case 'EXTERNAL_URL':
      default:
        return 'Referencia';
    }
  }

  mediaOriginDescription(originType: string | null | undefined): string {
    switch (originType) {
      case 'UPLOAD':
        return 'Asset propio listo para publicar.';
      case 'INGESTED':
        return 'Asset propio creado desde una referencia externa.';
      case 'EXTERNAL_URL':
      default:
        return 'Referencia externa, todavía fuera de la biblioteca local.';
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

  requestEdit() {
    if (this.compact) {
      this.editRequested.emit(this.persisted);
      return;
    }

    this.toggleAdvanced();
  }

  setActiveEditorSlot(slot: MediaEditorSlotKey) {
    this.activeEditorSlot = slot;
  }

  togglePanelSection(section: 'composition' | 'previews' | 'metadata') {
    if (section === 'composition') {
      this.compositionOpen = !this.compositionOpen;
      return;
    }

    if (section === 'previews') {
      this.previewsOpen = !this.previewsOpen;
      return;
    }

    this.metadataOpen = !this.metadataOpen;
  }

  togglePrecision() {
    this.precisionOpen = !this.precisionOpen;
  }

  setRole(role: string) {
    this.syncSlotToRole(role);
    this.assignRole.emit({ link: this.draft, role });
  }

  toggleRole(role: string) {
    if (this.draft.role === role) {
      if (role !== 'GALLERY') {
        this.assignRole.emit({ link: this.draft, role: 'GALLERY' });
      }
      return;
    }

    this.syncSlotToRole(role);
    this.assignRole.emit({ link: this.draft, role });
  }

  toggleLegacyFallback() {
    this.toggleLegacy.emit(this.draft);
  }

  saveChanges() {
    this.save.emit(this.draft);
  }

  discardChanges() {
    this.discard.emit(this.persisted);
  }

  removeLink() {
    this.remove.emit(this.persisted);
  }

  ingestLink() {
    this.ingest.emit(this.persisted);
  }

  promoteLink() {
    this.promote.emit(this.persisted);
  }

  restoreLink() {
    this.restore.emit(this.persisted);
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

  isRoleSelected(role: string): boolean {
    return this.draft.role === role;
  }

  isRolePersisted(role: string): boolean {
    return this.persisted.role === role;
  }

  rolePillClass(role: string): string {
    const selected = this.isRoleSelected(role);
    const persisted = this.isRolePersisted(role);

    if (selected && persisted) {
      return 'media-role-pill media-role-pill--selected';
    }

    if (selected) {
      return 'media-role-pill media-role-pill--pending';
    }

    if (persisted) {
      return 'media-role-pill media-role-pill--persisted';
    }

    return 'media-role-pill';
  }

  legacyPillClass(): string {
    if (this.draft.isPrimary && this.persisted.isPrimary) {
      return 'media-role-pill media-role-pill--selected media-role-pill--legacy';
    }

    if (this.draft.isPrimary) {
      return 'media-role-pill media-role-pill--pending media-role-pill--legacy';
    }

    if (this.persisted.isPrimary) {
      return 'media-role-pill media-role-pill--persisted media-role-pill--legacy';
    }

    return 'media-role-pill media-role-pill--legacy';
  }

  editorSlotClass(slot: MediaEditorSlotKey): string {
    return this.activeEditorSlot === slot
      ? 'media-role-pill media-role-pill--selected'
      : 'media-role-pill media-role-pill--persisted';
  }

  updateAssetFocal(axis: 'x' | 'y', value: number | string | null) {
    const numeric = this.toNullableNumber(value);
    if (axis === 'x') {
      this.draft.assetFocalX = numeric;
      if (this.draft.focalX === null || this.draft.focalX === undefined || this.draft.focalX === '') {
        this.draft.focalX = numeric;
      }
      return;
    }

    this.draft.assetFocalY = numeric;
    if (this.draft.focalY === null || this.draft.focalY === undefined || this.draft.focalY === '') {
      this.draft.focalY = numeric;
    }
  }

  updateSlotCrop(axis: 'x' | 'y' | 'zoom', value: number | string | null) {
    this.draft.slotCrops[this.activeEditorSlot] = {
      ...this.draft.slotCrops[this.activeEditorSlot],
      [axis]: this.toNullableNumber(value),
    };
  }

  resetSlotCrop() {
    this.draft.slotCrops[this.activeEditorSlot] = {
      x: null,
      y: null,
      zoom: null,
    };
  }

  nudgeSlotCrop(axis: 'x' | 'y', delta: number) {
    const current = this.toNullableNumber(this.draft.slotCrops[this.activeEditorSlot]?.[axis]) ?? 50;
    this.updateSlotCrop(axis, this.clamp(current + delta, 0, 100));
  }

  adjustSlotZoom(delta: number) {
    const current = this.toNullableNumber(this.draft.slotCrops[this.activeEditorSlot]?.zoom) ?? 1;
    this.updateSlotCrop('zoom', this.clamp(Number((current + delta).toFixed(2)), 1, 3));
  }

  startAssetDrag(event: PointerEvent) {
    const surface = event.currentTarget as HTMLElement | null;
    if (!surface) {
      return;
    }

    event.preventDefault();
    surface.setPointerCapture?.(event.pointerId);
    this.dragTarget = 'asset';
    this.dragSurface = surface;
    this.dragPointerId = event.pointerId;
    this.updatePointFromPointer(event);
  }

  startSlotDrag(event: PointerEvent) {
    const surface = event.currentTarget as HTMLElement | null;
    if (!surface) {
      return;
    }

    event.preventDefault();
    surface.setPointerCapture?.(event.pointerId);
    this.dragTarget = 'slot';
    this.dragSurface = surface;
    this.dragPointerId = event.pointerId;
    this.updatePointFromPointer(event);
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (!this.dragTarget || !this.dragSurface) {
      return;
    }

    if (this.dragPointerId !== null && event.pointerId !== this.dragPointerId) {
      return;
    }

    if (event.buttons === 0) {
      this.stopDrag();
      return;
    }

    event.preventDefault();
    this.updatePointFromPointer(event);
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  @HostListener('window:blur')
  stopDrag() {
    if (this.dragSurface && this.dragPointerId !== null && this.dragSurface.hasPointerCapture?.(this.dragPointerId)) {
      this.dragSurface.releasePointerCapture(this.dragPointerId);
    }
    this.dragTarget = null;
    this.dragSurface = null;
    this.dragPointerId = null;
  }

  private updatePointFromPointer(event: PointerEvent) {
    if (!this.dragSurface || !this.dragTarget) {
      return;
    }

    const point = this.relativePointFromElement(this.dragSurface, event.clientX, event.clientY);
    if (!point) {
      return;
    }

    if (this.dragTarget === 'asset') {
      this.draft.assetFocalX = point.x;
      this.draft.assetFocalY = point.y;
      return;
    }

    this.draft.slotCrops[this.activeEditorSlot] = {
      ...this.draft.slotCrops[this.activeEditorSlot],
      x: point.x,
      y: point.y,
      zoom: this.toNullableNumber(this.draft.slotCrops[this.activeEditorSlot]?.zoom) ?? 1,
    };
  }

  slotFrameClass(slot: MediaEditorSlotKey): string {
    const frame = this.editorSlotOptions.find((item) => item.key === slot)?.frame ?? 'square';
    return `media-crop-preview media-crop-preview--${frame}`;
  }

  slotViewportStageClass(slot: MediaEditorSlotKey): string {
    const frame = this.editorSlotOptions.find((item) => item.key === slot)?.frame ?? 'square';
    return `media-editor__viewport-frame media-editor__viewport-frame--${frame}`;
  }

  slotCropSummary(slot: MediaEditorSlotKey): string {
    const crop = this.draft.slotCrops[slot];
    const x = this.toNullableNumber(crop?.x);
    const y = this.toNullableNumber(crop?.y);
    const zoom = this.toNullableNumber(crop?.zoom);
    if (x === null && y === null && zoom === null) {
      return 'Usa focal point base o centro.';
    }

    return `Encuadre ${Math.round(x ?? 50)} / ${Math.round(y ?? 50)} · zoom ${(zoom ?? 1).toFixed(2)}x`;
  }

  hasSlotWarnings(slot: MediaEditorSlotKey): boolean {
    return (this.slotWarnings[slot]?.length ?? 0) > 0;
  }

  private relativePointFromElement(target: HTMLElement, clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.min(100, Math.max(0, Number(x.toFixed(2)))),
      y: Math.min(100, Math.max(0, Number(y.toFixed(2)))),
    };
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private syncActiveEditorSlot() {
    const editorId = this.draft?.id ?? null;
    if (!editorId || editorId === this.lastEditorId) {
      return;
    }

    this.lastEditorId = editorId;
    this.activeEditorSlot = this.slotForRole(this.draft.role) ?? 'detail';
  }

  private syncSlotToRole(role: string) {
    const slot = this.slotForRole(role);
    if (slot) {
      this.activeEditorSlot = slot;
    }
  }

  private slotForRole(role: string | null | undefined): MediaEditorSlotKey | null {
    switch (role) {
      case 'EXPLORER_3D':
        return 'explorer3d';
      case 'CARD':
        return 'list';
      case 'DETAIL':
        return 'detail';
      case 'THUMBNAIL':
        return 'preview';
      default:
        return null;
    }
  }
}
