import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminEntitiesApi,
  AdminEntityMediaPayload,
  AdminEntityPayload,
  AdminUploadEntityMediaPayload,
} from '../../../core/api/admin-entities.api';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import {
  ResolvedMediaSlotState,
  resolveEntityMediaGallery,
  resolveEntityMediaSlot,
} from '../../../shared/media/media.utils';

type EditableAdminMediaLink = {
  id: string;
  role: string;
  sortOrder: number | string;
  isPrimary: boolean;
  displayMode: string;
  focalX: number | string | null;
  focalY: number | string | null;
  media: {
    id: string;
    url: string;
    displayUrl?: string | null;
    sourcePageUrl?: string | null;
    alt?: string | null;
    source?: string | null;
    photoBy?: string | null;
    license?: string | null;
    provider?: string | null;
    width?: number | null;
    height?: number | null;
    originType?: string | null;
    storageKey?: string | null;
    originalFilename?: string | null;
    fileSize?: number | null;
  };
  saving?: boolean;
  removing?: boolean;
};

type VisualSlot = {
  key: 'hero' | 'card' | 'detail' | 'thumbnail' | 'explorer3d' | 'gallery' | 'primary';
  label: string;
  description: string;
  previewUsage: 'hero' | 'card' | 'detail' | 'thumbnail' | 'explorer3d' | 'gallery';
  previewClass: string;
  state: ResolvedMediaSlotState;
  count?: number;
};

@Component({
  standalone: true,
  selector: 'app-admin-entity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, JanoMediaComponent],
  templateUrl: './admin-entity-form.component.html',
  styleUrls: ['./admin-entity-form.component.scss'],
})
export class AdminEntityFormComponent implements OnInit, OnDestroy {
  private adminApi = inject(AdminEntitiesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

@ViewChild('contentTextarea')
contentTextarea?: ElementRef<HTMLTextAreaElement>;

@ViewChild('previewContainer')
previewContainer?: ElementRef<HTMLElement>;

  linkSuggestions: any[] = [];
  linkSearch = '';
  linkLoading = false;
  showLinkSuggestions = false;
  linkStartIndex = -1;
  hoveredSlug: string | null = null;
  previewData: any | null = null;
  previewLoading = false;



  private closePreviewTimer: ReturnType<typeof setTimeout> | null = null;
  private previewRequestId = 0;
  private isHoveringPreviewLink = false;
  isHoveringPreviewPopup = false;
  private previewRequestSlug: string | null = null;

  successMessage = '';
  submitMode: 'back' | 'stay' = 'back';

  mediaLinks: EditableAdminMediaLink[] = [];
  mediaLoading = false;
  mediaMessage = '';
  mediaError = '';
  addingMedia = false;
  uploadingMedia = false;
  uploadPreviewUrl: string | null = null;
  selectedUploadFile: File | null = null;

  mediaRoles = [
    'PRIMARY_LEGACY',
    'HERO',
    'CARD',
    'DETAIL',
    'THUMBNAIL',
    'EXPLORER_3D',
    'GALLERY',
  ] as const;

  mediaRoleLabels: Record<string, string> = {
    PRIMARY_LEGACY: 'Primary legacy',
    HERO: 'Hero',
    CARD: 'Card',
    DETAIL: 'Detail',
    THUMBNAIL: 'Thumbnail',
    EXPLORER_3D: 'Explorer 3D',
    GALLERY: 'Gallery',
  };

  displayModes = [
    { value: '', label: 'Auto' },
    { value: 'COVER', label: 'Cover' },
    { value: 'CONTAIN', label: 'Contain' },
  ];

  newMedia = this.createEmptyMediaDraft();
  uploadMediaDraft = this.createEmptyMediaDraft();

  private linkSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  incomingRelations: any[] = [];
  incomingRelationsLoading = false;

  relationTypes = [
    'RELATES_TO',
    'INFLUENCED_BY',
    'PART_OF',
    'CREATED_BY',
    'REFERENCES',
  ];

  relations: any[] = [];
  relationSearch = '';
  relationResults: any[] = [];
  relationLoading = false;
  relationsLoading = false;

  newRelation = {
    toId: '',
    type: 'RELATES_TO',
    justification: '',
  };

  types: AdminEntityPayload['type'][] = [
    'ARTWORK',
    'ARTIST',
    'CONCEPT',
    'MOVEMENT',
    'PERIOD',
    'TEXT',
    'PLACE',
  ];

  statuses: NonNullable<AdminEntityPayload['status']>[] = [
    'DRAFT',
    'IN_REVIEW',
    'PUBLISHED',
  ];

  levels: NonNullable<AdminEntityPayload['contentLevel']>[] = [
    'BASIC',
    'INTERMEDIATE',
    'ADVANCED',
  ];

  saving = false;
  loading = false;
  errorMessage = '';
  loadError = '';

  isEdit = false;
  entityId = '';
  slugTouched = false;

  form: {
    type: AdminEntityPayload['type'];
    title: string;
    slug: string;
    summary: string;
    content: string;
    contentLevel: '' | NonNullable<AdminEntityPayload['contentLevel']>;
    status: NonNullable<AdminEntityPayload['status']>;
    startYear: number | null | string;
    endYear: number | null | string;
  } = {
      type: 'ARTWORK',
      title: '',
      slug: '',
      summary: '',
      content: '',
      contentLevel: '',
      status: 'DRAFT',
      startYear: null,
      endYear: null,
    };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    this.entityId = id ?? '';

    this.linkSearch$
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();

          if (q.length < 1) {
            return of({ items: [] });
          }

          this.linkLoading = true;
          this.cdr.markForCheck();

          return this.adminApi.list({
            q,
            limit: 8,
            page: 1,
            sort: 'title',
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res: any) => {
          const items = Array.isArray(res?.items) ? res.items : [];
          this.linkSuggestions = items;
          this.linkLoading = false;
          this.showLinkSuggestions = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.linkSuggestions = [];
          this.linkLoading = false;
          this.showLinkSuggestions = true;
          this.cdr.markForCheck();
        },
      });

    if (!this.isEdit || !this.entityId) {
      return;
    }

    this.loading = true;
    this.loadError = '';

    this.loadEntity();
  }
  ngAfterViewInit() {
  const container = this.previewContainer?.nativeElement;
  if (!container) return;

  container.addEventListener('mouseover', (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest('.entity-link') as HTMLElement | null;

    if (!link) return;

    const slug = link.dataset['slug'];
    if (!slug) return;

    this.isHoveringPreviewLink = true;
    this.cancelClosePreview();
    this.openPreview(slug);
  });

  container.addEventListener('mouseout', (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest('.entity-link') as HTMLElement | null;

    if (!link) return;

    const related = event.relatedTarget as HTMLElement | null;

    // Si vas hacia otro link del preview, no cierres
    if (related?.closest('.entity-link')) {
      return;
    }

    // Si vas hacia el popup, no cierres
    if (related?.closest('.entity-preview-popover')) {
      this.isHoveringPreviewLink = false;
      return;
    }

    this.isHoveringPreviewLink = false;
    this.scheduleClosePreview();
  });
}

  onTitleChange(value: string) {
    this.form.title = value;

    if (!this.slugTouched) {
      this.form.slug = this.slugify(value);
    }
  }

  onSlugChange(value: string) {
    this.slugTouched = true;
    this.form.slug = this.slugify(value);
  }

  private slugify(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private buildPayload(): AdminEntityPayload {
    return {
      type: this.form.type,
      title: (this.form.title ?? '').trim(),
      slug: (this.form.slug ?? '').trim(),
      summary: (this.form.summary ?? '').trim() || undefined,
      content: (this.form.content ?? '').trim() || undefined,
      contentLevel: this.form.contentLevel || undefined,
      status: this.form.status || undefined,
      startYear:
        this.form.startYear !== null && this.form.startYear !== ''
          ? Number(this.form.startYear)
          : undefined,
      endYear:
        this.form.endYear !== null && this.form.endYear !== ''
          ? Number(this.form.endYear)
          : undefined,
    };
  }

  private loadEntity() {
    if (!this.entityId) {
      return;
    }

    this.adminApi.getById(this.entityId).subscribe({
      next: (entity) => {
        this.form = {
          type: entity.type ?? 'ARTWORK',
          title: entity.title ?? '',
          slug: entity.slug ?? '',
          summary: entity.summary ?? '',
          content: entity.content ?? '',
          contentLevel: entity.contentLevel ?? '',
          status: entity.status ?? 'DRAFT',
          startYear: entity.startYear ?? null,
          endYear: entity.endYear ?? null,
        };

        this.mediaLinks = Array.isArray(entity.mediaLinks)
          ? entity.mediaLinks.map((link: any) => this.normalizeMediaLink(link))
          : [];

        this.slugTouched = true;
        this.loading = false;
        this.loadRelations();
        this.loadIncomingRelations();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadError = err?.error?.message ?? 'No se pudo cargar la entity';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submit(mode: 'back' | 'stay' = 'back') {
    this.errorMessage = '';
    this.successMessage = '';
    this.submitMode = mode;

    const payload = this.buildPayload();

    if (!payload.title || !payload.slug || !payload.type) {
      this.errorMessage = 'Título, slug y tipo son obligatorios.';
      return;
    }

    this.saving = true;

    const req$ = this.isEdit
      ? this.adminApi.update(this.entityId, payload)
      : this.adminApi.create(payload);

    req$.subscribe({
      next: (entity) => {
        this.saving = false;
        this.successMessage = this.isEdit
          ? 'Entity actualizada correctamente.'
          : 'Entity creada correctamente.';

        this.cdr.markForCheck();

        if (mode === 'stay') {
          if (!this.isEdit && entity?.id) {
            this.router.navigate(['/admin/entities', entity.id, 'edit']);
          }
          return;
        }

        setTimeout(() => {
          this.router.navigate(['/admin']);
        }, 700);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message ?? 'No se pudo guardar la entity';
        this.cdr.markForCheck();
      },
    });
  }

  loadRelations() {
    if (!this.entityId) return;

    this.relationsLoading = true;

    this.adminApi.listRelations(this.entityId).subscribe({
      next: (rows) => {
        this.relations = rows;
        this.relationsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.relations = [];
        this.relationsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadIncomingRelations() {
    if (!this.entityId) return;

    this.incomingRelationsLoading = true;

    this.adminApi.listIncomingRelations(this.entityId).subscribe({
      next: (rows) => {
        this.incomingRelations = rows;
        this.incomingRelationsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.incomingRelations = [];
        this.incomingRelationsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  searchRelationTargets() {
    const q = this.relationSearch.trim();

    if (!q || q.length < 2) {
      this.relationResults = [];
      this.cdr.markForCheck();
      return;
    }

    this.relationLoading = true;

    this.adminApi.list({
      q,
      limit: 12,
      page: 1,
      sort: 'title',
    }).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.items) ? res.items : [];
        this.relationResults = items.filter((item: any) => item.id !== this.entityId);
        this.relationLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.relationResults = [];
        this.relationLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectRelationTarget(entity: any) {
    this.newRelation.toId = entity.id;
    this.relationSearch = `${entity.title} (${entity.type})`;
    this.relationResults = [];
    this.cdr.markForCheck();
  }

  addRelation() {
    if (!this.entityId || !this.newRelation.toId || !this.newRelation.type.trim()) {
      return;
    }

    this.adminApi.createRelation(this.entityId, {
      toId: this.newRelation.toId,
      type: this.newRelation.type.trim(),
      justification: this.newRelation.justification.trim() || undefined,
    }).subscribe({
      next: () => {
        this.newRelation = {
          toId: '',
          type: 'RELATES_TO',
          justification: '',
        };
        this.relationSearch = '';
        this.relationResults = [];
        this.loadRelations();
        this.loadIncomingRelations();
      },
      error: () => {
        this.errorMessage = 'No se pudo crear la relación';
        this.cdr.markForCheck();
      },
    });
  }

  removeRelation(relationId: string) {
    if (!this.entityId) return;

    const ok = window.confirm('¿Quitar esta relación?');
    if (!ok) return;

    this.adminApi.deleteRelation(this.entityId, relationId).subscribe({
      next: () => {
        this.loadRelations();
        this.loadIncomingRelations();
      },
      error: () => {
        this.errorMessage = 'No se pudo borrar la relación';
        this.cdr.markForCheck();
      },
    });
  }

  mediaRoleLabel(role: string | null | undefined): string {
    return this.mediaRoleLabels[role ?? ''] ?? role ?? '—';
  }

  mediaOriginLabel(originType: string | null | undefined): string {
    switch (originType) {
      case 'UPLOAD':
        return 'Uploaded file';
      case 'INGESTED':
        return 'Ingested asset';
      case 'EXTERNAL_URL':
      default:
        return 'External URL';
    }
  }

  get mediaEntityContext() {
    return {
      type: this.form.type,
      title: this.form.title,
      summary: this.form.summary,
      mediaLinks: this.mediaLinks.map((link) => ({
        id: link.id,
        role: link.role,
        sortOrder: Number(link.sortOrder ?? 0),
        isPrimary: !!link.isPrimary,
        displayMode: link.displayMode || null,
        focalX: this.toNullableNumber(link.focalX),
        focalY: this.toNullableNumber(link.focalY),
        media: {
          ...link.media,
          displayMode: link.displayMode || null,
          focalX: this.toNullableNumber(link.focalX),
          focalY: this.toNullableNumber(link.focalY),
        },
      })),
    };
  }

  get visualSlots(): VisualSlot[] {
    const entity = this.mediaEntityContext;
    const galleryItems = resolveEntityMediaGallery(entity);
    const galleryState: ResolvedMediaSlotState = galleryItems.length
      ? {
        item: galleryItems[0] ?? null,
        source: entity.mediaLinks.some((link) => link.role === 'GALLERY') ? 'explicit' : 'fallback',
        matchedRole: galleryItems[0]?.role ?? null,
      }
      : {
        item: null,
        source: 'empty',
        matchedRole: null,
      };

    return [
      {
        key: 'hero',
        label: 'Hero',
        description: 'Uso principal amplio o destacado.',
        previewUsage: 'hero',
        previewClass: 'slot-preview--hero',
        state: resolveEntityMediaSlot(entity, 'hero'),
      },
      {
        key: 'card',
        label: 'Card',
        description: 'Listado y tarjetas del catálogo.',
        previewUsage: 'card',
        previewClass: 'slot-preview--card',
        state: resolveEntityMediaSlot(entity, 'card'),
      },
      {
        key: 'detail',
        label: 'Detail',
        description: 'Panel principal del detalle.',
        previewUsage: 'detail',
        previewClass: 'slot-preview--detail',
        state: resolveEntityMediaSlot(entity, 'detail'),
      },
      {
        key: 'thumbnail',
        label: 'Thumbnail',
        description: 'Relaciones, previews y formatos compactos.',
        previewUsage: 'thumbnail',
        previewClass: 'slot-preview--thumbnail',
        state: resolveEntityMediaSlot(entity, 'thumbnail'),
      },
      {
        key: 'explorer3d',
        label: 'Explorer 3D',
        description: 'Textura preferida para la vista inmersiva.',
        previewUsage: 'explorer3d',
        previewClass: 'slot-preview--explorer',
        state: resolveEntityMediaSlot(entity, 'explorer3d'),
      },
      {
        key: 'gallery',
        label: 'Gallery',
        description: 'Biblioteca adicional de imágenes.',
        previewUsage: 'gallery',
        previewClass: 'slot-preview--gallery',
        state: galleryState,
        count: galleryItems.length,
      },
      {
        key: 'primary',
        label: 'Primary fallback',
        description: 'Compatibilidad y fallback general.',
        previewUsage: 'card',
        previewClass: 'slot-preview--card',
        state: resolveEntityMediaSlot(entity, 'primary'),
      },
    ];
  }

  get mediaWarnings(): string[] {
    const warnings: string[] = [];
    const links = this.mediaLinks;

    if (!links.length) {
      warnings.push('Esta entity no tiene media asociada todavía.');
      return warnings;
    }

    const primaryCount = links.filter((link) => link.isPrimary).length;
    if (primaryCount > 1) {
      warnings.push(`Hay ${primaryCount} medias marcadas como primary fallback. Conviene dejar solo una.`);
    }

    const hasCard = links.some((link) => link.role === 'CARD');
    const hasDetail = links.some((link) => link.role === 'DETAIL');
    const hasOnlyLegacy = links.every((link) => link.role === 'PRIMARY_LEGACY');
    const galleryLinks = links.filter((link) => link.role === 'GALLERY');

    if (!hasCard) {
      warnings.push('No hay una media CARD explícita. El listado dependerá de fallback.');
    }

    if (!hasDetail) {
      warnings.push('No hay una media DETAIL explícita. El detalle principal dependerá de fallback.');
    }

    if (hasOnlyLegacy) {
      warnings.push('La entity depende solo de PRIMARY_LEGACY. Conviene asignar roles visuales explícitos.');
    }

    if (galleryLinks.length > 1) {
      const sortOrders = galleryLinks.map((link) => Number(link.sortOrder ?? 0));
      const uniqueOrders = new Set(sortOrders);
      if (uniqueOrders.size !== sortOrders.length) {
        warnings.push('Hay varias medias GALLERY con el mismo sortOrder. El orden puede ser ambiguo.');
      }
    }

    return warnings;
  }

  addMedia() {
    if (!this.entityId || this.addingMedia) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';

    const payload = this.buildMediaPayload(this.newMedia);
    if (!payload) {
      return;
    }

    this.addingMedia = true;

    this.adminApi.createMedia(this.entityId, payload).subscribe({
      next: (link) => {
        this.upsertMediaLink(link);
        this.newMedia = this.createEmptyMediaDraft();
        this.addingMedia = false;
        this.mediaMessage = 'Media añadida correctamente.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.addingMedia = false;
        this.mediaError = err?.error?.message ?? 'No se pudo añadir la media.';
        this.cdr.markForCheck();
      },
    });
  }

  onUploadFileSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.setUploadFile(file);
  }

  onUploadDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onUploadDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.setUploadFile(file);
  }

  clearSelectedUpload() {
    this.setUploadFile(null);
  }

  uploadMediaFromFile() {
    if (!this.entityId || this.uploadingMedia || !this.selectedUploadFile) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';

    const payload = this.buildUploadPayload(this.uploadMediaDraft);
    this.uploadingMedia = true;

    this.adminApi.uploadMedia(this.entityId, this.selectedUploadFile, payload).subscribe({
      next: (link) => {
        this.upsertMediaLink(link);
        this.uploadingMedia = false;
        this.uploadMediaDraft = this.createEmptyMediaDraft();
        this.clearSelectedUpload();
        this.mediaMessage = 'Archivo subido y asociado correctamente.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uploadingMedia = false;
        this.mediaError = err?.error?.message ?? 'No se pudo subir el archivo.';
        this.cdr.markForCheck();
      },
    });
  }

  saveMedia(link: EditableAdminMediaLink) {
    if (!this.entityId || link.saving) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';

    const payload = this.buildMediaPayload({
      ...link,
      ...link.media,
    });

    if (!payload) {
      return;
    }

    link.saving = true;

    this.adminApi.updateMedia(this.entityId, link.id, payload).subscribe({
      next: (updatedLink) => {
        this.upsertMediaLink(updatedLink);
        this.mediaMessage = 'Media actualizada correctamente.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        link.saving = false;
        this.mediaError = err?.error?.message ?? 'No se pudo actualizar la media.';
        this.cdr.markForCheck();
      },
    });
  }

  removeMedia(link: EditableAdminMediaLink) {
    if (!this.entityId || link.removing) {
      return;
    }

    const ok = window.confirm('¿Quitar esta media de la entity? La media global no se borrará.');
    if (!ok) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';
    link.removing = true;

    this.adminApi.deleteMedia(this.entityId, link.id).subscribe({
      next: () => {
        this.mediaLinks = this.mediaLinks.filter((item) => item.id !== link.id);
        this.mediaMessage = 'Asociación de media eliminada.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        link.removing = false;
        this.mediaError = err?.error?.message ?? 'No se pudo quitar la media.';
        this.cdr.markForCheck();
      },
    });
  }

  assignRole(link: EditableAdminMediaLink, role: string) {
    if (link.role === role) {
      return;
    }

    link.role = role;
    this.saveMedia(link);
  }

  slotStatusLabel(slot: VisualSlot): string {
    switch (slot.state.source) {
      case 'explicit':
        return 'Explícito';
      case 'fallback':
        return `Fallback${slot.state.matchedRole ? ` · ${this.mediaRoleLabel(slot.state.matchedRole)}` : ''}`;
      default:
        return 'Vacío';
    }
  }

  mediaPreview(link: EditableAdminMediaLink) {
    return {
      ...link.media,
      displayMode: link.displayMode || null,
      focalX: this.toNullableNumber(link.focalX),
      focalY: this.toNullableNumber(link.focalY),
    };
  }

  private createEmptyMediaDraft() {
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
      focalX: null as number | string | null,
      focalY: null as number | string | null,
    };
  }

  private setUploadFile(file: File | null) {
    if (this.uploadPreviewUrl) {
      URL.revokeObjectURL(this.uploadPreviewUrl);
      this.uploadPreviewUrl = null;
    }

    this.selectedUploadFile = file;

    if (file && file.type.startsWith('image/')) {
      this.uploadPreviewUrl = URL.createObjectURL(file);
    }

    this.cdr.markForCheck();
  }

  private normalizeMediaLink(link: any): EditableAdminMediaLink {
    return {
      id: link.id,
      role: link.role ?? 'CARD',
      sortOrder: link.sortOrder ?? 0,
      isPrimary: !!link.isPrimary,
      displayMode: link.displayMode ?? '',
      focalX: link.focalX ?? null,
      focalY: link.focalY ?? null,
      media: {
        id: link.media?.id ?? '',
        url: link.media?.url ?? '',
        displayUrl: link.media?.displayUrl ?? '',
        sourcePageUrl: link.media?.sourcePageUrl ?? '',
        alt: link.media?.alt ?? '',
        source: link.media?.source ?? '',
        photoBy: link.media?.photoBy ?? '',
        license: link.media?.license ?? '',
        provider: link.media?.provider ?? null,
        width: link.media?.width ?? null,
        height: link.media?.height ?? null,
        originType: link.media?.originType ?? 'EXTERNAL_URL',
        storageKey: link.media?.storageKey ?? null,
        originalFilename: link.media?.originalFilename ?? null,
        fileSize: link.media?.fileSize ?? null,
      },
      saving: false,
      removing: false,
    };
  }

  private upsertMediaLink(link: any) {
    const normalized = this.normalizeMediaLink(link);
    const existingIndex = this.mediaLinks.findIndex((item) => item.id === normalized.id);

    if (existingIndex >= 0) {
      const next = [...this.mediaLinks];
      next[existingIndex] = normalized;
      this.mediaLinks = this.sortMediaLinks(next);
      return;
    }

    this.mediaLinks = this.sortMediaLinks([...this.mediaLinks, normalized]);
  }

  private sortMediaLinks(items: EditableAdminMediaLink[]) {
    return [...items].sort((a, b) => {
      const orderDiff = Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
      if (orderDiff !== 0) {
        return orderDiff;
      }

      return (a.id ?? '').localeCompare(b.id ?? '', 'en');
    });
  }

  private buildMediaPayload(source: any): AdminEntityMediaPayload | null {
    const url = String(source.url ?? '').trim();

    if (!url) {
      this.mediaError = 'La URL de media es obligatoria.';
      this.cdr.markForCheck();
      return null;
    }

    return {
      url,
      displayUrl: String(source.displayUrl ?? '').trim() || undefined,
      sourcePageUrl: String(source.sourcePageUrl ?? '').trim() || undefined,
      alt: String(source.alt ?? '').trim() || undefined,
      source: String(source.source ?? '').trim() || undefined,
      photoBy: String(source.photoBy ?? '').trim() || undefined,
      license: String(source.license ?? '').trim() || undefined,
      role: source.role,
      sortOrder: Number(source.sortOrder ?? 0),
      isPrimary: !!source.isPrimary,
      displayMode: source.displayMode || null,
      focalX: this.toNullableNumber(source.focalX),
      focalY: this.toNullableNumber(source.focalY),
    };
  }

  private buildUploadPayload(source: any): AdminUploadEntityMediaPayload {
    return {
      alt: String(source.alt ?? '').trim() || undefined,
      source: String(source.source ?? '').trim() || undefined,
      photoBy: String(source.photoBy ?? '').trim() || undefined,
      license: String(source.license ?? '').trim() || undefined,
      role: source.role,
      sortOrder: Number(source.sortOrder ?? 0),
      isPrimary: !!source.isPrimary,
      displayMode: source.displayMode || null,
      focalX: this.toNullableNumber(source.focalX),
      focalY: this.toNullableNumber(source.focalY),
    };
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  onContentInput() {
    const value = this.form.content ?? '';
    const textarea = this.contentTextarea?.nativeElement;

    if (!textarea) {
      this.closeLinkSuggestions();
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);

    const match = beforeCursor.match(/\[\[([^[\]]*)$/);

    if (!match) {
      this.closeLinkSuggestions();
      return;
    }

    const query = (match[1] ?? '').trim();
    const startIndex = beforeCursor.lastIndexOf('[[');

    if (query.includes(']]')) {
      this.closeLinkSuggestions();
      return;
    }

    this.linkStartIndex = startIndex;
    this.linkSearch = query;
    this.showLinkSuggestions = true;

    if (query.length < 1) {
      this.linkSuggestions = [];
      this.linkLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.linkSearch$.next(query);
  }

  insertEntityLink(entity: any) {
    const textarea = this.contentTextarea?.nativeElement;
    const value = this.form.content ?? '';

    if (!textarea || this.linkStartIndex < 0) {
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const before = value.slice(0, this.linkStartIndex);
    const after = value.slice(cursor);

    const inserted = `[[${entity.slug}|${entity.title}]]`;
    const nextValue = `${before}${inserted}${after}`;

    this.form.content = nextValue;
    this.closeLinkSuggestions();
    this.cdr.markForCheck();

    queueMicrotask(() => {
      if (!textarea) return;
      textarea.focus();

      const nextCursor = before.length + inserted.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  closeLinkSuggestions() {
    this.linkSuggestions = [];
    this.linkSearch = '';
    this.linkLoading = false;
    this.showLinkSuggestions = false;
    this.linkStartIndex = -1;
    this.cdr.markForCheck();
  }

  renderContentPreview(text: string | null | undefined): string {
  if (!text) return '';

  const escaped = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  const withLinks = escaped.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, slug, label) => {
      const safeSlug = String(slug).trim();
      const safeLabel = String(label ?? slug).trim();

      return `<a class="entity-link" data-slug="${safeSlug}">${safeLabel}</a>`;
    }
  );

  return withLinks.replace(/\n/g, '<br>');
}

  ngOnDestroy() {
    if (this.uploadPreviewUrl) {
      URL.revokeObjectURL(this.uploadPreviewUrl);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

 openPreview(slug: string) {
  this.cancelClosePreview();

  if (this.hoveredSlug === slug && (this.previewLoading || this.previewData)) {
    return;
  }

  this.hoveredSlug = slug;
  this.previewLoading = true;
  this.previewData = null;

  const requestId = ++this.previewRequestId;

  this.adminApi.previewBySlug(slug).subscribe({
    next: (data: any) => {
      // Ignora respuestas viejas
      if (requestId !== this.previewRequestId) return;

      // Si ya cambió el slug activo, ignora
      if (this.hoveredSlug !== slug) return;

      this.previewData = data;
      this.previewLoading = false;
      this.cdr.markForCheck();
    },
    error: () => {
      if (requestId !== this.previewRequestId) return;
      if (this.hoveredSlug !== slug) return;

      this.previewData = null;
      this.previewLoading = false;
      this.cdr.markForCheck();
    },
  });
}

scheduleClosePreview() {
  this.cancelClosePreview();

  this.closePreviewTimer = setTimeout(() => {
    if (this.isHoveringPreviewLink || this.isHoveringPreviewPopup) {
      return;
    }

    this.hoveredSlug = null;
    this.previewData = null;
    this.previewLoading = false;
    this.cdr.markForCheck();
  }, 120);
}

cancelClosePreview() {
  if (this.closePreviewTimer) {
    clearTimeout(this.closePreviewTimer);
    this.closePreviewTimer = null;
  }
}
}
