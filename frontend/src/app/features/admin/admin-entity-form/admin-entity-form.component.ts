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
  AdminEntityResponse,
  AdminEntitiesApi,
  AdminContributorPayload,
  AdminEntityDetailsPayload,
  AdminMediaAsset,
  AdminMediaAssignment,
  AdminMediaCoverageSummary,
  AdminMediaWarning,
  AdminEntityMediaPayload,
  AdminEntityPayload,
  AdminResolvedSlot,
  AdminSourceRefPayload,
  AdminUploadEntityMediaPayload,
} from '../../../core/api/admin-entities.api';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { MediaAddPanelComponent } from './media-add-panel.component';
import { MediaCardEditorComponent } from './media-card-editor.component';
import {
  EditableAdminMediaEditor,
  EditableAdminMediaLink,
  MEDIA_ROLE_LABELS,
  MediaAddExternalSubmit,
  MediaAddUploadSubmit,
  UploadPreviewDimensions,
} from './media-admin.models';

type ResolvedMediaSlotState = {
  item: AdminMediaAsset | null;
  source: 'explicit' | 'fallback' | 'empty';
  matchedRole: string | null;
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
  imports: [FormsModule, RouterLink, JanoMediaComponent, MediaAddPanelComponent, MediaCardEditorComponent],
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

  readonly dashboardSections = [
    { id: 'section-content', label: 'Contenido' },
    { id: 'section-media', label: 'Media library' },
    { id: 'section-sources', label: 'Fuentes' },
    { id: 'section-contributors', label: 'Colaboradores' },
    { id: 'section-relations', label: 'Relaciones' },
  ] as const;
  activeDashboardSection = 'section-content';

  successMessage = '';
  submitMode: 'back' | 'stay' = 'back';

  mediaEditors: EditableAdminMediaEditor[] = [];
  persistedMediaLinks: EditableAdminMediaLink[] = [];
  resolvedVisualSlots: VisualSlot[] = [];
  mediaWarningMessages: string[] = [];
  mediaCoverageSummary: AdminMediaCoverageSummary | null = null;
  mediaLoading = false;
  mediaMessage = '';
  mediaError = '';
  addingMedia = false;
  uploadingMedia = false;
  mediaAddResetVersion = 0;
  mediaRoleLabels: Record<string, string> = MEDIA_ROLE_LABELS;

  private linkSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  incomingRelations: any[] = [];
  incomingRelationsLoading = false;

  sourceTypes: AdminSourceRefPayload['sourceType'][] = [
    'BOOK',
    'ARTICLE',
    'WEBSITE',
    'CATALOG',
    'PAPER',
  ];

  relationTypes = [
    'CREATED_BY',
    'BELONGS_TO_MOVEMENT',
    'BELONGS_TO_PERIOD',
    'ABOUT_CONCEPT',
    'LOCATED_IN',
    'RELATED_TO',
    'MENTIONS',
    'ASSOCIATED_WITH',
    'INSPIRED_BY',
    'INFLUENCED_BY',
    'PART_OF',
  ];

  relations: any[] = [];
  relationSearch = '';
  relationResults: any[] = [];
  relationLoading = false;
  relationsLoading = false;

  newRelation = {
    toId: '',
    type: 'RELATED_TO',
    justification: '',
  };

  detailsSaving = false;
  detailsMessage = '';
  detailsError = '';
  detailsForm: AdminEntityDetailsPayload = {};

  sourceRefs: any[] = [];
  sourcesSaving = false;
  sourcesMessage = '';
  sourcesError = '';
  newSourceRef: AdminSourceRefPayload = {
    sourceType: 'WEBSITE',
    sourceTitle: '',
    sourceAuthor: '',
    sourcePublisher: '',
    sourceYear: null,
    sourceUrl: '',
    page: '',
    quote: '',
    note: '',
  };

  contributors: any[] = [];
  contributorsSaving = false;
  contributorsMessage = '';
  contributorsError = '';
  newContributor: AdminContributorPayload = {
    name: '',
    role: '',
    note: '',
  };

  types: AdminEntityPayload['type'][] = [
    'ARTWORK',
    'ARTIST',
    'ARTICLE',
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

  scrollToSection(sectionId: string) {
    if (typeof document === 'undefined') {
      return;
    }

    this.activeDashboardSection = sectionId;

    if (typeof window !== 'undefined' && window.location.hash) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, '', cleanUrl);
    }

    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });
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
        this.applyEntityResponse(entity, false);
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

  private applyEntityResponse(entity: AdminEntityResponse, preserveDirtyMediaEditors = true, clearedEditorId?: string) {
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

    this.applyMediaLibraryState(entity, preserveDirtyMediaEditors, clearedEditorId);
    this.detailsForm = this.extractDetailsForm(entity);
    this.sourceRefs = Array.isArray(entity.sourceRefs)
      ? entity.sourceRefs.map((ref: any) => this.normalizeSourceRef(ref))
      : [];
    this.contributors = Array.isArray(entity.contributors)
      ? entity.contributors.map((contributor: any) => this.normalizeContributor(contributor))
      : [];
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
          type: 'RELATED_TO',
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

  saveDetails() {
    if (!this.entityId || this.detailsSaving || !this.supportsTypedDetails()) {
      return;
    }

    this.detailsError = '';
    this.detailsMessage = '';
    this.detailsSaving = true;

    this.adminApi.updateDetails(this.entityId, this.buildDetailsPayload()).subscribe({
      next: (entity) => {
        this.detailsSaving = false;
        this.detailsForm = this.extractDetailsForm(entity);
        this.detailsMessage = 'Ficha específica actualizada correctamente.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.detailsSaving = false;
        this.detailsError = err?.error?.message ?? 'No se pudo actualizar la ficha específica.';
        this.cdr.markForCheck();
      },
    });
  }

  addSourceRef() {
    if (!this.entityId || this.sourcesSaving) {
      return;
    }

    const payload = this.buildSourceRefPayload(this.newSourceRef);
    if (!payload) {
      return;
    }

    this.sourcesError = '';
    this.sourcesMessage = '';
    this.sourcesSaving = true;

    this.adminApi.createSourceRef(this.entityId, payload).subscribe({
      next: (ref) => {
        this.sourcesSaving = false;
        this.sourceRefs = [...this.sourceRefs, this.normalizeSourceRef(ref)];
        this.newSourceRef = {
          sourceType: 'WEBSITE',
          sourceTitle: '',
          sourceAuthor: '',
          sourcePublisher: '',
          sourceYear: null,
          sourceUrl: '',
          page: '',
          quote: '',
          note: '',
        };
        this.sourcesMessage = 'Fuente añadida correctamente.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.sourcesSaving = false;
        this.sourcesError = err?.error?.message ?? 'No se pudo añadir la fuente.';
        this.cdr.markForCheck();
      },
    });
  }

  saveSourceRef(ref: any) {
    if (!this.entityId || this.sourcesSaving) {
      return;
    }

    const payload = this.buildSourceRefPayload(ref);
    if (!payload) {
      return;
    }

    this.sourcesError = '';
    this.sourcesMessage = '';
    this.sourcesSaving = true;

    this.adminApi.updateSourceRef(this.entityId, ref.id, payload).subscribe({
      next: (updated) => {
        this.sourcesSaving = false;
        this.upsertSourceRef(updated);
        this.sourcesMessage = 'Fuente actualizada correctamente.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.sourcesSaving = false;
        this.sourcesError = err?.error?.message ?? 'No se pudo actualizar la fuente.';
        this.cdr.markForCheck();
      },
    });
  }

  removeSourceRef(refId: string) {
    if (!this.entityId || this.sourcesSaving) {
      return;
    }

    const ok = window.confirm('¿Quitar esta fuente de la entidad?');
    if (!ok) {
      return;
    }

    this.sourcesError = '';
    this.sourcesMessage = '';
    this.sourcesSaving = true;

    this.adminApi.deleteSourceRef(this.entityId, refId).subscribe({
      next: () => {
        this.sourcesSaving = false;
        this.sourceRefs = this.sourceRefs.filter((ref) => ref.id !== refId);
        this.sourcesMessage = 'Fuente eliminada.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.sourcesSaving = false;
        this.sourcesError = err?.error?.message ?? 'No se pudo eliminar la fuente.';
        this.cdr.markForCheck();
      },
    });
  }

  addContributor() {
    if (!this.entityId || this.contributorsSaving) {
      return;
    }

    const payload = this.buildContributorPayload(this.newContributor);
    if (!payload) {
      return;
    }

    this.contributorsError = '';
    this.contributorsMessage = '';
    this.contributorsSaving = true;

    this.adminApi.createContributor(this.entityId, payload).subscribe({
      next: (contributor) => {
        this.contributorsSaving = false;
        this.contributors = [...this.contributors, this.normalizeContributor(contributor)];
        this.newContributor = { name: '', role: '', note: '' };
        this.contributorsMessage = 'Colaborador añadido correctamente.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.contributorsSaving = false;
        this.contributorsError = err?.error?.message ?? 'No se pudo añadir el colaborador.';
        this.cdr.markForCheck();
      },
    });
  }

  saveContributor(contributor: any) {
    if (!this.entityId || this.contributorsSaving) {
      return;
    }

    const payload = this.buildContributorPayload(contributor);
    if (!payload) {
      return;
    }

    this.contributorsError = '';
    this.contributorsMessage = '';
    this.contributorsSaving = true;

    this.adminApi.updateContributor(this.entityId, contributor.id, payload).subscribe({
      next: (updated) => {
        this.contributorsSaving = false;
        this.upsertContributor(updated);
        this.contributorsMessage = 'Colaborador actualizado correctamente.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.contributorsSaving = false;
        this.contributorsError = err?.error?.message ?? 'No se pudo actualizar el colaborador.';
        this.cdr.markForCheck();
      },
    });
  }

  removeContributor(contributorId: string) {
    if (!this.entityId || this.contributorsSaving) {
      return;
    }

    const ok = window.confirm('¿Quitar este colaborador?');
    if (!ok) {
      return;
    }

    this.contributorsError = '';
    this.contributorsMessage = '';
    this.contributorsSaving = true;

    this.adminApi.deleteContributor(this.entityId, contributorId).subscribe({
      next: () => {
        this.contributorsSaving = false;
        this.contributors = this.contributors.filter((item) => item.id !== contributorId);
        this.contributorsMessage = 'Colaborador eliminado.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.contributorsSaving = false;
        this.contributorsError = err?.error?.message ?? 'No se pudo eliminar el colaborador.';
        this.cdr.markForCheck();
      },
    });
  }

  supportsTypedDetails(): boolean {
    return ['ARTWORK', 'ARTIST', 'CONCEPT', 'PERIOD'].includes(this.form.type);
  }

  typedDetailsTitle(): string {
    switch (this.form.type) {
      case 'ARTWORK':
        return 'Ficha de obra';
      case 'ARTIST':
        return 'Ficha de artista';
      case 'CONCEPT':
        return 'Ficha de concepto';
      case 'PERIOD':
        return 'Ficha de periodo';
      default:
        return 'Ficha específica';
    }
  }

  contentFieldLabel(): string {
    return this.form.type === 'ARTICLE' ? 'Cuerpo del artículo' : 'Contenido';
  }

  contentFieldHint(): string {
    return this.form.type === 'ARTICLE'
      ? 'Usa #, ## y ### para títulos, > para citas, :::lead ... ::: para texto grande, y [[slug]] o [[slug|texto]] para enlazar entidades.'
      : 'Texto principal de la entidad. Puedes usar [[slug]] o [[slug|texto]] para enlazar.';
  }

  summaryFieldHint(): string {
    return this.form.type === 'ARTICLE'
      ? 'Entradilla breve para la portada y el hero del artículo.'
      : 'Resumen breve de la entidad.';
  }

  typedDetailsSummary(): string {
    switch (this.form.type) {
      case 'ARTWORK':
        return this.compactJoin([
          this.detailsForm.technique,
          this.detailsForm.materials,
          this.detailsForm.dimensions,
          this.detailsForm.location,
        ]);
      case 'ARTIST':
        return this.compactJoin([
          this.detailsForm.country,
          this.detailsForm.city,
          this.detailsForm.disciplines,
        ]);
      case 'CONCEPT':
      case 'PERIOD':
        return String(this.detailsForm.definition ?? '').trim();
      default:
        return '';
    }
  }

  previewKeyConnections(): Array<{ label: string; value: string }> {
    const groups: Array<{ label: string; value: string }> = [];
    const outgoing = Array.isArray(this.relations) ? this.relations : [];
    const incoming = Array.isArray(this.incomingRelations) ? this.incomingRelations : [];

    const first = (type: string) => outgoing.find((rel) => rel.type === type);
    const collectTargets = (type: string) => outgoing.filter((rel) => rel.type === type).map((rel) => rel.to?.title).filter(Boolean);

    const author = first('CREATED_BY')?.to?.title;
    if (author) groups.push({ label: 'Autor', value: author });

    const movement = first('BELONGS_TO_MOVEMENT')?.to?.title;
    if (movement) groups.push({ label: 'Movimiento', value: movement });

    const period = first('BELONGS_TO_PERIOD')?.to?.title;
    if (period) groups.push({ label: 'Periodo', value: period });

    const concepts = collectTargets('ABOUT_CONCEPT');
    if (concepts.length) groups.push({ label: 'Conceptos', value: concepts.join(' · ') });

    const places = collectTargets('LOCATED_IN');
    if (places.length) groups.push({ label: 'Ubicación', value: places.join(' · ') });

    const relatedArtworks = [
      ...outgoing.filter((rel) => rel.type === 'RELATED_TO' && rel.to?.type === 'ARTWORK').map((rel) => rel.to?.title),
      ...incoming.filter((rel) => rel.type === 'RELATED_TO' && rel.from?.type === 'ARTWORK').map((rel) => rel.from?.title),
    ].filter(Boolean);
    if (relatedArtworks.length) {
      groups.push({ label: 'Obras relacionadas', value: Array.from(new Set(relatedArtworks)).join(' · ') });
    }

    return groups;
  }

  hasPreviewKeyConnections(): boolean {
    return this.previewKeyConnections().length > 0;
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

  mediaOriginDescription(originType: string | null | undefined): string {
    switch (originType) {
      case 'UPLOAD':
        return 'Asset propio subido al storage local de JANO.';
      case 'INGESTED':
        return 'Asset propio generado desde una referencia externa ya asociada.';
      case 'EXTERNAL_URL':
      default:
        return 'Referencia externa remota; no se almacena en JANO.';
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

  get primaryVisualSlots(): VisualSlot[] {
    return this.visualSlots.filter((slot) => ['hero', 'card', 'detail'].includes(slot.key));
  }

  get secondaryVisualSlots(): VisualSlot[] {
    return this.visualSlots.filter((slot) => !['hero', 'card', 'detail'].includes(slot.key));
  }

  canIngestMedia(link: EditableAdminMediaLink): boolean {
    return link.media.originType === 'EXTERNAL_URL';
  }

  sourceExternalLink(link: EditableAdminMediaLink): EditableAdminMediaLink | null {
    if (link.media.originType !== 'INGESTED') {
      return null;
    }

    if (link.media.derivedFromMediaId) {
      const direct = this.persistedMediaLinks.find((candidate) => candidate.media.id === link.media.derivedFromMediaId);
      if (direct?.media.originType === 'EXTERNAL_URL') {
        return direct;
      }
    }

    const canonical = String(link.media.canonicalUrl ?? '').trim().replace(/\/+$/, '');
    if (!canonical) {
      return null;
    }

    return this.persistedMediaLinks.find((candidate) => {
      if (candidate.id === link.id || candidate.media.originType !== 'EXTERNAL_URL') {
        return false;
      }

      const values = [
        candidate.media.canonicalUrl,
        candidate.media.displayUrl,
        candidate.media.url,
      ]
        .map((value) => String(value ?? '').trim().replace(/\/+$/, ''))
        .filter(Boolean);

      return values.includes(canonical);
    }) ?? null;
  }

  canPromoteIngestedMedia(link: EditableAdminMediaLink): boolean {
    return link.media.originType === 'INGESTED'
      && !!this.sourceExternalLink(link)
      ;
  }

  canRestoreExternalMedia(link: EditableAdminMediaLink): boolean {
    return link.media.originType === 'EXTERNAL_URL'
      && !!this.replacementIngestedLink(link);
  }

  ingestedSourceLabel(link: EditableAdminMediaLink): string | null {
    if (link.media.originType !== 'INGESTED') {
      return null;
    }

    return link.media.canonicalUrl || link.media.sourcePageUrl || null;
  }

  replacementTargetLabel(link: EditableAdminMediaLink): string | null {
    const source = this.sourceExternalLink(link);
    if (!source) {
      return null;
    }

    return `${this.mediaRoleLabel(source.role)} · asset ${source.media.id}`;
  }

  replacementIngestedLabel(link: EditableAdminMediaLink): string | null {
    const ingested = this.replacementIngestedLink(link);
    return ingested ? `asset INGESTED ${ingested.media.id}` : null;
  }

  hasPromotedVisualReplacement(link: EditableAdminMediaLink): boolean {
    const source = this.sourceExternalLink(link);
    if (!source || link.media.originType !== 'INGESTED') {
      return false;
    }

    return source.role === 'GALLERY'
      && (link.role !== 'GALLERY' || link.isPrimary);
  }

  replacementIngestedLink(link: EditableAdminMediaLink): EditableAdminMediaLink | null {
    if (link.media.originType !== 'EXTERNAL_URL') {
      return null;
    }

    const externalCandidates = [
      link.media.canonicalUrl,
      link.media.displayUrl,
      link.media.url,
    ]
      .map((value) => String(value ?? '').trim().replace(/\/+$/, ''))
      .filter(Boolean);

    if (!externalCandidates.length) {
      return this.persistedMediaLinks.find((candidate) =>
        candidate.media.originType === 'INGESTED'
        && candidate.media.derivedFromMediaId === link.media.id
        && this.hasPromotedVisualReplacement(candidate),
      ) ?? null;
    }

    const byDerivedFrom = this.persistedMediaLinks.find((candidate) =>
      candidate.media.originType === 'INGESTED'
      && candidate.media.derivedFromMediaId === link.media.id
      && this.hasPromotedVisualReplacement(candidate),
    );

    if (byDerivedFrom) {
      return byDerivedFrom;
    }

    return this.persistedMediaLinks.find((candidate) =>
      candidate.media.originType === 'INGESTED'
      && this.hasPromotedVisualReplacement(candidate)
      && externalCandidates.includes(String(candidate.media.canonicalUrl ?? '').trim().replace(/\/+$/, '')),
    ) ?? null;
  }

  get visualSlots(): VisualSlot[] {
    return this.resolvedVisualSlots;
  }

  get mediaWarnings(): string[] {
    return this.mediaWarningMessages;
  }

  slotResolutionLabel(slot: VisualSlot): string {
    if (slot.state.source === 'explicit') {
      return 'Asignación explícita';
    }

    if (slot.state.source === 'fallback') {
      return slot.state.matchedRole
        ? `Resuelto por fallback desde ${this.mediaRoleLabel(slot.state.matchedRole)}`
        : 'Resuelto por fallback';
    }

    return 'No hay media resuelta para este contexto';
  }

  slotStateClass(slot: VisualSlot): string {
    switch (slot.state.source) {
      case 'explicit':
        return 'media-pill--slot-explicit';
      case 'fallback':
        return slot.state.matchedRole === 'PRIMARY_LEGACY'
          ? 'media-pill--legacy'
          : 'media-pill--slot-fallback';
      default:
        return 'media-pill--slot-empty';
    }
  }

  slotPreviewEyebrow(slot: VisualSlot): string {
    switch (slot.key) {
      case 'hero':
        return 'Vista destacada';
      case 'card':
        return 'Catálogo';
      case 'detail':
        return 'Detalle';
      case 'thumbnail':
        return 'Compacto';
      case 'explorer3d':
        return 'Explorer';
      case 'gallery':
        return 'Galería';
      case 'primary':
      default:
        return 'Fallback';
    }
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

  addExternalMedia(event: MediaAddExternalSubmit) {
    if (!this.entityId || this.addingMedia) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';

    const payload = this.buildMediaPayload(event.draft);
    if (!payload) {
      return;
    }

    this.addingMedia = true;

    this.adminApi.createMedia(this.entityId, payload).subscribe({
      next: () => {
        this.mediaAddResetVersion += 1;
        this.addingMedia = false;
        this.mediaMessage = 'Media añadida correctamente.';
        this.refreshMediaLibrary(true);
      },
      error: (err) => {
        this.addingMedia = false;
        this.mediaError = err?.error?.message ?? 'No se pudo añadir la media.';
        this.cdr.markForCheck();
      },
    });
  }

  uploadMediaFromDraft(event: MediaAddUploadSubmit) {
    if (!this.entityId || this.uploadingMedia) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';

    const payload = this.buildUploadPayload(event.draft, event.dimensions);
    this.uploadingMedia = true;

    this.adminApi.uploadMedia(this.entityId, event.file, payload).subscribe({
      next: () => {
        this.mediaAddResetVersion += 1;
        this.uploadingMedia = false;
        this.mediaMessage = 'Archivo subido y asociado correctamente.';
        this.refreshMediaLibrary(true);
      },
      error: (err) => {
        this.uploadingMedia = false;
        this.mediaError = err?.error?.message ?? 'No se pudo subir el archivo.';
        this.cdr.markForCheck();
      },
    });
  }

  saveMedia(link: EditableAdminMediaLink) {
    const editor = this.editorForLink(link);
    if (!this.entityId || !editor || editor.saveState === 'saving') {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';
    this.markEditorDirty(editor);

    const payload = this.buildMediaPayload({
      ...editor.draft,
      ...editor.draft.media,
    });

    if (!payload) {
      return;
    }

    editor.saveState = 'saving';
    editor.errorMessage = '';

    this.adminApi.updateMedia(this.entityId, link.id, payload).subscribe({
      next: () => {
        editor.saveState = 'idle';
        this.mediaMessage = 'Media actualizada correctamente.';
        this.refreshMediaLibrary(true, editor.id);
      },
      error: (err) => {
        editor.saveState = 'error';
        editor.errorMessage = err?.error?.message ?? 'No se pudo actualizar la media.';
        this.mediaError = err?.error?.message ?? 'No se pudo actualizar la media.';
        this.cdr.markForCheck();
      },
    });
  }

  removeMedia(link: EditableAdminMediaLink) {
    const editor = this.editorForLink(link);
    if (!this.entityId || !editor || editor.removing) {
      return;
    }

    const ok = window.confirm('¿Quitar esta media de la entity? La media global no se borrará.');
    if (!ok) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';
    editor.removing = true;

    this.adminApi.deleteMedia(this.entityId, link.id).subscribe({
      next: () => {
        editor.removing = false;
        this.mediaMessage = 'Asociación de media eliminada.';
        this.refreshMediaLibrary(true, editor.id);
      },
      error: (err) => {
        editor.removing = false;
        this.mediaError = err?.error?.message ?? 'No se pudo quitar la media.';
        this.cdr.markForCheck();
      },
    });
  }

  ingestMedia(link: EditableAdminMediaLink) {
    const editor = this.editorForLink(link);
    if (!this.entityId || !editor || !this.canIngestMedia(link) || editor.ingesting) {
      return;
    }

    const ok = window.confirm(
      'Se descargará esta media externa al storage local de JANO y se creará un nuevo asset INGESTED. El asset externo original se mantendrá sin cambios. ¿Continuar?',
    );
    if (!ok) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';
    editor.ingesting = true;

    this.adminApi.ingestMedia(this.entityId, link.id).subscribe({
      next: (createdLink) => {
        editor.ingesting = false;
        this.mediaMessage = createdLink?.alreadyExisted
          ? 'Ya existía un asset INGESTED derivado de esta referencia. Se reutiliza la asociación existente.'
          : 'Media ingerida correctamente. Se añadió como asset INGESTED sin reemplazar la referencia externa.';
        this.refreshMediaLibrary(true);
      },
      error: (err) => {
        editor.ingesting = false;
        this.mediaError = err?.error?.message ?? 'No se pudo ingerir la media externa.';
        this.cdr.markForCheck();
      },
    });
  }

  promoteIngestedMedia(link: EditableAdminMediaLink) {
    const editor = this.editorForLink(link);
    if (!this.entityId || !editor || !this.canPromoteIngestedMedia(link) || editor.promoting) {
      return;
    }

    const source = this.sourceExternalLink(link);
    const sourceRoleLabel = source ? this.mediaRoleLabel(source.role) : 'el asset externo origen';

    const ok = window.confirm(
      `El asset INGESTED asumirá ${sourceRoleLabel}, sortOrder, isPrimary, displayMode y focales del externo del que deriva. El externo quedará visible como referencia GALLERY. ¿Continuar?`,
    );
    if (!ok) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';
    editor.promoting = true;

    this.adminApi.promoteIngestedMedia(this.entityId, link.id).subscribe({
      next: () => {
        editor.promoting = false;
        this.mediaMessage = 'El asset INGESTED ocupa ahora el papel visual del externo. El asset externo sigue visible como referencia.';
        this.refreshMediaLibrary(true);
      },
      error: (err) => {
        editor.promoting = false;
        this.mediaError = err?.error?.message ?? 'No se pudo promover el asset INGESTED.';
        this.cdr.markForCheck();
      },
    });
  }

  restoreExternalMedia(link: EditableAdminMediaLink) {
    const editor = this.editorForLink(link);
    if (!this.entityId || !editor || !this.canRestoreExternalMedia(link) || editor.restoring) {
      return;
    }

    const ingested = this.replacementIngestedLink(link);
    const ingestedRoleLabel = ingested ? this.mediaRoleLabel(ingested.role) : 'el asset ingerido promovido';

    const ok = window.confirm(
      `El asset EXTERNAL_URL recuperará ${ingestedRoleLabel}, sortOrder, isPrimary, displayMode y focales. El INGESTED seguirá visible como referencia GALLERY. ¿Continuar?`,
    );
    if (!ok) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';
    editor.restoring = true;

    this.adminApi.restoreExternalMedia(this.entityId, link.id).subscribe({
      next: () => {
        editor.restoring = false;
        this.mediaMessage = 'El asset externo recupera ahora el papel visual principal. El INGESTED sigue visible como referencia.';
        this.refreshMediaLibrary(true);
      },
      error: (err) => {
        editor.restoring = false;
        this.mediaError = err?.error?.message ?? 'No se pudo restaurar el asset externo.';
        this.cdr.markForCheck();
      },
    });
  }

  assignRole(link: EditableAdminMediaLink, role: string) {
    if (link.role === role) {
      return;
    }

    link.role = role;
    const editor = this.editorForLink(link);
    if (editor) {
      this.markEditorDirty(editor);
    }
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

  private extractDetailsForm(entity: any): AdminEntityDetailsPayload {
    return {
      authorNation: entity?.artwork?.authorNation ?? '',
      technique: entity?.artwork?.technique ?? '',
      materials: entity?.artwork?.materials ?? '',
      dimensions: entity?.artwork?.dimensions ?? '',
      location: entity?.artwork?.location ?? '',
      collection: entity?.artwork?.collection ?? '',
      state: entity?.artwork?.state ?? '',
      country: entity?.artist?.country ?? '',
      city: entity?.artist?.city ?? '',
      birthYear: entity?.artist?.birthYear ?? null,
      deathYear: entity?.artist?.deathYear ?? null,
      disciplines: entity?.artist?.disciplines ?? '',
      bioShort: entity?.artist?.bioShort ?? '',
      links: entity?.artist?.links ?? '',
      definition: entity?.concept?.definition ?? entity?.period?.definition ?? '',
    };
  }

  private buildDetailsPayload(): AdminEntityDetailsPayload {
    return {
      authorNation: String(this.detailsForm.authorNation ?? '').trim() || undefined,
      technique: String(this.detailsForm.technique ?? '').trim() || undefined,
      materials: String(this.detailsForm.materials ?? '').trim() || undefined,
      dimensions: String(this.detailsForm.dimensions ?? '').trim() || undefined,
      location: String(this.detailsForm.location ?? '').trim() || undefined,
      collection: String(this.detailsForm.collection ?? '').trim() || undefined,
      state: String(this.detailsForm.state ?? '').trim() || undefined,
      country: String(this.detailsForm.country ?? '').trim() || undefined,
      city: String(this.detailsForm.city ?? '').trim() || undefined,
      birthYear: this.toNullableNumber(this.detailsForm.birthYear),
      deathYear: this.toNullableNumber(this.detailsForm.deathYear),
      disciplines: String(this.detailsForm.disciplines ?? '').trim() || undefined,
      bioShort: String(this.detailsForm.bioShort ?? '').trim() || undefined,
      links: String(this.detailsForm.links ?? '').trim() || undefined,
      definition: String(this.detailsForm.definition ?? '').trim() || undefined,
    };
  }

  private normalizeSourceRef(ref: any) {
    return {
      id: ref.id,
      sourceType: ref.source?.type ?? 'WEBSITE',
      sourceTitle: ref.source?.title ?? '',
      sourceAuthor: ref.source?.author ?? '',
      sourcePublisher: ref.source?.publisher ?? '',
      sourceYear: ref.source?.year ?? null,
      sourceUrl: ref.source?.url ?? '',
      page: ref.page ?? '',
      quote: ref.quote ?? '',
      note: ref.note ?? '',
    };
  }

  private buildSourceRefPayload(source: any): AdminSourceRefPayload | null {
    const title = String(source.sourceTitle ?? '').trim();
    if (!title) {
      this.sourcesError = 'El título de la fuente es obligatorio.';
      this.cdr.markForCheck();
      return null;
    }

    return {
      sourceType: source.sourceType,
      sourceTitle: title,
      sourceAuthor: String(source.sourceAuthor ?? '').trim() || undefined,
      sourcePublisher: String(source.sourcePublisher ?? '').trim() || undefined,
      sourceYear: this.toNullableNumber(source.sourceYear),
      sourceUrl: String(source.sourceUrl ?? '').trim() || undefined,
      page: String(source.page ?? '').trim() || undefined,
      quote: String(source.quote ?? '').trim() || undefined,
      note: String(source.note ?? '').trim() || undefined,
    };
  }

  private upsertSourceRef(ref: any) {
    const normalized = this.normalizeSourceRef(ref);
    const existingIndex = this.sourceRefs.findIndex((item) => item.id === normalized.id);

    if (existingIndex >= 0) {
      const next = [...this.sourceRefs];
      next[existingIndex] = normalized;
      this.sourceRefs = next;
      return;
    }

    this.sourceRefs = [...this.sourceRefs, normalized];
  }

  private normalizeContributor(contributor: any) {
    return {
      id: contributor.id,
      name: contributor.name ?? '',
      role: contributor.role ?? '',
      note: contributor.note ?? '',
    };
  }

  private buildContributorPayload(source: any): AdminContributorPayload | null {
    const name = String(source.name ?? '').trim();
    const role = String(source.role ?? '').trim();

    if (!name || !role) {
      this.contributorsError = 'Nombre y rol del colaborador son obligatorios.';
      this.cdr.markForCheck();
      return null;
    }

    return {
      name,
      role,
      note: String(source.note ?? '').trim() || undefined,
    };
  }

  private upsertContributor(contributor: any) {
    const normalized = this.normalizeContributor(contributor);
    const existingIndex = this.contributors.findIndex((item) => item.id === normalized.id);

    if (existingIndex >= 0) {
      const next = [...this.contributors];
      next[existingIndex] = normalized;
      this.contributors = next;
      return;
    }

    this.contributors = [...this.contributors, normalized];
  }

  private compactJoin(values: Array<string | number | null | undefined>): string {
    return values
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .join(' · ');
  }

  private applyMediaLibraryState(entity: AdminEntityResponse, preserveDirtyEditors = true, clearedEditorId?: string) {
    const library = entity.mediaLibrary;
    const assetMap = new Map<string, AdminMediaAsset>();

    for (const asset of library?.assets ?? []) {
      assetMap.set(asset.assetId, asset);
    }

    const assignments = library?.assignments ?? this.legacyAssignmentsFromEntity(entity);
    const nextPersisted = assignments
      .map((assignment) => this.normalizeMediaAssignment(assignment, assetMap.get(assignment.assetId)))
      .filter((assignment): assignment is EditableAdminMediaLink => !!assignment);

    const existingEditors = new Map(this.mediaEditors.map((editor) => [editor.id, editor]));

    this.persistedMediaLinks = this.sortMediaLinks(nextPersisted);
    this.mediaEditors = this.persistedMediaLinks.map((persisted) => {
      const existing = existingEditors.get(persisted.id);
      const preserveDraft = preserveDirtyEditors && existing?.isDirty && existing.id !== clearedEditorId;

      if (existing && preserveDraft) {
        return {
          ...existing,
          persisted,
        };
      }

      return {
        id: persisted.id,
        persisted,
        draft: this.cloneMediaLink(persisted),
        isDirty: false,
        saveState: 'idle',
        errorMessage: '',
        removing: false,
        ingesting: false,
        promoting: false,
        restoring: false,
      };
    });

    this.resolvedVisualSlots = (library?.resolvedSlots ?? []).map((slot) => this.normalizeResolvedSlot(slot));
    this.mediaWarningMessages = (library?.warnings ?? []).map((warning) => warning.message);
    this.mediaCoverageSummary = library?.coverageSummary ?? null;
  }

  private normalizeMediaAssignment(assignment: AdminMediaAssignment, asset?: AdminMediaAsset): EditableAdminMediaLink | null {
    if (!assignment?.assignmentId || !asset) {
      return null;
    }

    return {
      id: assignment.assignmentId,
      role: assignment.role ?? 'CARD',
      sortOrder: assignment.sortOrder ?? 0,
      isPrimary: !!assignment.isPrimary,
      displayMode: assignment.displayMode ?? '',
      focalX: assignment.focalX ?? null,
      focalY: assignment.focalY ?? null,
      media: {
        id: asset.id ?? asset.assetId,
        url: asset.url ?? '',
        derivedFromMediaId: asset.derivedFromMediaId ?? null,
        canonicalUrl: asset.canonicalUrl ?? '',
        displayUrl: asset.displayUrl ?? '',
        sourcePageUrl: asset.sourcePageUrl ?? '',
        alt: asset.alt ?? '',
        source: asset.source ?? '',
        photoBy: asset.photoBy ?? '',
        license: asset.license ?? '',
        provider: asset.provider ?? null,
        qualityTier: asset.qualityTier ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
        originType: asset.originType ?? 'EXTERNAL_URL',
        storageKey: asset.storageKey ?? null,
        originalFilename: asset.originalFilename ?? null,
        fileSize: asset.fileSize ?? null,
      },
    };
  }

  private legacyAssignmentsFromEntity(entity: AdminEntityResponse): AdminMediaAssignment[] {
    return (entity.mediaLinks ?? []).map((link: any) => ({
      assignmentId: link.id,
      assetId: link.media?.id,
      role: link.role ?? 'CARD',
      sortOrder: link.sortOrder ?? 0,
      isPrimary: !!link.isPrimary,
      displayMode: link.displayMode ?? null,
      focalX: link.focalX ?? null,
      focalY: link.focalY ?? null,
    }));
  }

  private normalizeResolvedSlot(slot: AdminResolvedSlot): VisualSlot {
    const definitions: Record<VisualSlot['key'], Omit<VisualSlot, 'state' | 'count'>> = {
      hero: { key: 'hero', label: 'Hero', description: 'Uso principal amplio o destacado.', previewUsage: 'hero', previewClass: 'slot-preview--hero' },
      card: { key: 'card', label: 'Card', description: 'Listado y tarjetas del catálogo.', previewUsage: 'card', previewClass: 'slot-preview--card' },
      detail: { key: 'detail', label: 'Detail', description: 'Panel principal del detalle.', previewUsage: 'detail', previewClass: 'slot-preview--detail' },
      thumbnail: { key: 'thumbnail', label: 'Thumbnail', description: 'Relaciones, previews y formatos compactos.', previewUsage: 'thumbnail', previewClass: 'slot-preview--thumbnail' },
      explorer3d: { key: 'explorer3d', label: 'Explorer 3D', description: 'Textura preferida para la vista inmersiva.', previewUsage: 'explorer3d', previewClass: 'slot-preview--explorer' },
      gallery: { key: 'gallery', label: 'Gallery', description: 'Biblioteca adicional de imágenes.', previewUsage: 'gallery', previewClass: 'slot-preview--gallery' },
      primary: { key: 'primary', label: 'Primary fallback', description: 'Compatibilidad y fallback general.', previewUsage: 'card', previewClass: 'slot-preview--card' },
    };

    return {
      ...definitions[slot.slotKey],
      state: {
        item: slot.item,
        source: slot.source,
        matchedRole: slot.matchedRole,
      },
      count: slot.count,
    };
  }

  private cloneMediaLink(link: EditableAdminMediaLink): EditableAdminMediaLink {
    return {
      ...link,
      media: {
        ...link.media,
      },
    };
  }

  private editorForLink(link: EditableAdminMediaLink): EditableAdminMediaEditor | null {
    return this.mediaEditors.find((editor) => editor.id === link.id) ?? null;
  }

  private markEditorDirty(editor: EditableAdminMediaEditor) {
    editor.isDirty = !this.mediaLinksEqual(editor.persisted, editor.draft);
    if (!editor.isDirty && editor.saveState !== 'saving') {
      editor.saveState = 'idle';
      editor.errorMessage = '';
    }
  }

  private syncMediaDraftFlags() {
    for (const editor of this.mediaEditors) {
      this.markEditorDirty(editor);
    }
  }

  private mediaLinksEqual(a: EditableAdminMediaLink, b: EditableAdminMediaLink): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private refreshMediaLibrary(preserveDirtyEditors = true, clearedEditorId?: string) {
    if (!this.entityId) {
      return;
    }

    this.syncMediaDraftFlags();

    this.adminApi.getById(this.entityId).subscribe({
      next: (entity) => {
        this.applyEntityResponse(entity, preserveDirtyEditors, clearedEditorId);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.mediaError = err?.error?.message ?? 'No se pudo refrescar la media.';
        this.cdr.markForCheck();
      },
    });
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
        derivedFromMediaId: link.media?.derivedFromMediaId ?? null,
        canonicalUrl: link.media?.canonicalUrl ?? '',
        displayUrl: link.media?.displayUrl ?? '',
        sourcePageUrl: link.media?.sourcePageUrl ?? '',
        alt: link.media?.alt ?? '',
        source: link.media?.source ?? '',
        photoBy: link.media?.photoBy ?? '',
        license: link.media?.license ?? '',
        provider: link.media?.provider ?? null,
        qualityTier: link.media?.qualityTier ?? null,
        width: link.media?.width ?? null,
        height: link.media?.height ?? null,
        originType: link.media?.originType ?? 'EXTERNAL_URL',
        storageKey: link.media?.storageKey ?? null,
        originalFilename: link.media?.originalFilename ?? null,
        fileSize: link.media?.fileSize ?? null,
      },
    };
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

  private buildUploadPayload(source: any, dimensions: UploadPreviewDimensions | null): AdminUploadEntityMediaPayload {
    return {
      alt: String(source.alt ?? '').trim() || undefined,
      source: String(source.source ?? '').trim() || undefined,
      photoBy: String(source.photoBy ?? '').trim() || undefined,
      license: String(source.license ?? '').trim() || undefined,
      width: dimensions?.width,
      height: dimensions?.height,
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

  activeSlotLabels(link: EditableAdminMediaLink): string[] {
    return this.visualSlots
      .filter((slot) => slot.state.item?.id === link.media.id)
      .map((slot) => slot.label);
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
