import {
  DoCheck,
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
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminAdditionalMediaItem,
  AdminEntityResponse,
  AdminEntitiesApi,
  AdminContributorPayload,
  AdminEntityDetailsPayload,
  AdminMediaAsset,
  AdminMediaAssignment,
  AdminMediaCoverageSummary,
  AdminEntityMediaPayload,
  AdminEntityPayload,
  AdminEntityTranslationPayload,
  AdminLocale,
  AdminMediaWarning,
  AdminResolvedSlot,
  AdminSourceRefPayload,
  AdminUploadEntityMediaPayload,
} from '../../../core/api/admin-entities.api';
import { RelationType, RelationTypesApi } from '../../../core/api/relation-types.api';
import { Tag, TagsApi } from '../../../core/api/tags.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { EntityDetailViewComponent } from '../../entity/entity-detail-view.component';
import { MediaAddPanelComponent } from './media-add-panel.component';
import { MediaCardEditorComponent } from './media-card-editor.component';
import {
  EditableAdminMediaEditor,
  EditableAdminMediaLink,
  MEDIA_ROLE_LABELS,
  MediaAddExternalSubmit,
  MediaAddUploadSubmit,
  MediaEditorSlotKey,
  MediaSlotCropMap,
  UploadPreviewDimensions,
} from './media-admin.models';

type ResolvedMediaSlotState = {
  item: AdminMediaAsset | null;
  source: 'explicit' | 'fallback' | 'legacy' | 'empty';
  matchedRole: string | null;
  explanation: string;
  reasonCode: string;
};

type VisualSlot = {
  key: 'explorer3d' | 'list' | 'detail' | 'preview';
  label: string;
  description: string;
  previewUsage: 'explorer3d' | 'card' | 'detail' | 'thumbnail';
  previewClass: string;
  state: ResolvedMediaSlotState;
};

type DashboardSectionId =
  | 'section-content'
  | 'section-media'
  | 'section-preview'
  | 'section-sources'
  | 'section-contributors'
  | 'section-relations';

type MediaLibraryViewId = 'coverage' | 'library' | 'add';

type EntitySaveState = 'idle' | 'saving' | 'saved' | 'error';

type TranslationCompleteness = 'complete' | 'partial' | 'missing';

type AdminTranslationForm = {
  title: string;
  shortDescription: string;
  essay: string;
  notes: string;
  excerpt: string;
};

type AdminLocalizedDetailsForm = {
  authorNation: string;
  technique: string;
  materials: string;
  dimensions: string;
  location: string;
  collection: string;
  state: string;
  country: string;
  city: string;
  disciplines: string;
  bioShort: string;
  links: string;
  definition: string;
};

@Component({
  standalone: true,
  selector: 'app-admin-entity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, JanoMediaComponent, EntityDetailViewComponent, MediaAddPanelComponent, MediaCardEditorComponent],
  templateUrl: './admin-entity-form.component.html',
  styleUrls: ['./admin-entity-form.component.scss'],
})
export class AdminEntityFormComponent implements OnInit, OnDestroy, DoCheck {
  private adminApi = inject(AdminEntitiesApi);
  private relationTypesApi = inject(RelationTypesApi);
  private tagsApi = inject(TagsApi);
  readonly i18n = inject(I18nService);
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
  previewEntityModel: any | null = null;



  private closePreviewTimer: ReturnType<typeof setTimeout> | null = null;
  private previewRequestId = 0;
  private isHoveringPreviewLink = false;
  isHoveringPreviewPopup = false;
  private previewRequestSlug: string | null = null;
  private previewEntityStateKey = '';

  readonly dashboardSections = [
    { id: 'section-preview', label: 'Preview Detail' },
    { id: 'section-content', label: 'Global data' },
    { id: 'section-media', label: 'Media library' },
    { id: 'section-sources', label: 'Fuentes' },
    { id: 'section-contributors', label: 'Colaboradores' },
    { id: 'section-relations', label: 'Relaciones' },
  ] as const;
  activeDashboardSection: DashboardSectionId = 'section-preview';
  activeMediaLibraryView: MediaLibraryViewId = 'coverage';
  adminSidebarVisible = true;
  previewVisible = true;

  successMessage = '';
  submitMode: 'back' | 'stay' = 'back';
  entitySaveState: EntitySaveState = 'idle';
  entityLastSavedAt: Date | null = null;
  readonly translationLocales: Array<{ locale: AdminLocale; label: string }> = [
    { locale: 'es', label: 'Español' },
    { locale: 'en', label: 'English' },
  ];
  activeTranslationLocale: AdminLocale = 'es';
  translationForms: Record<AdminLocale, AdminTranslationForm> = {
    es: this.createEmptyTranslationForm(),
    en: this.createEmptyTranslationForm(),
  };
  localizedDetailForms: Record<AdminLocale, AdminLocalizedDetailsForm> = {
    es: this.createEmptyLocalizedDetailsForm(),
    en: this.createEmptyLocalizedDetailsForm(),
  };
  translationSaving = false;
  translationMessage = '';
  translationError = '';

  mediaEditors: EditableAdminMediaEditor[] = [];
  persistedMediaLinks: EditableAdminMediaLink[] = [];
  resolvedVisualSlots: VisualSlot[] = [];
  additionalMediaItems: AdminAdditionalMediaItem[] = [];
  mediaWarningMessages: string[] = [];
  mediaWarningsDetailed: AdminMediaWarning[] = [];
  mediaCoverageSummary: AdminMediaCoverageSummary | null = null;
  persistedResolvedMedia: any | null = null;
  activeMediaEditorId: string | null = null;
  mediaLoading = false;
  mediaMessage = '';
  mediaError = '';
  addingMedia = false;
  uploadingMedia = false;
  mediaAddResetVersion = 0;
  mediaRoleLabels: Record<string, string> = MEDIA_ROLE_LABELS;
  readonly mediaLibraryViews = [
    {
      id: 'coverage' as const,
      label: 'Cobertura',
      description: 'Cómo queda publicado y qué slot ocupa cada asset.',
    },
    {
      id: 'library' as const,
      label: 'Biblioteca',
      description: 'Gestiona assets, composición editorial y reemplazos.',
    },
    {
      id: 'add' as const,
      label: 'Añadir media',
      description: 'Incorpora nuevo material sin mezclarlo con la edición actual.',
    },
  ];

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

  relationTypes: RelationType[] = [];
  relationTypesLoading = false;

  availableTags: Tag[] = [];
  entityTags: any[] = [];
  selectedTagId = '';
  newTagLabel = '';
  newTagCategory = '';
  tagsLoading = false;
  tagsSaving = false;
  tagsMessage = '';
  tagsError = '';

  relations: any[] = [];
  relationSearch = '';
  relationResults: any[] = [];
  relationLoading = false;
  relationsLoading = false;

  newRelation = {
    toId: '',
    type: 'RELATED_TO',
    relationTypeId: '',
    justificationEs: '',
    justificationEn: '',
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
    sourceTitleEs: '',
    sourceTitleEn: '',
    sourceAuthor: '',
    sourceAuthorEs: '',
    sourceAuthorEn: '',
    sourcePublisher: '',
    sourcePublisherEs: '',
    sourcePublisherEn: '',
    sourceYear: null,
    sourceUrl: '',
    page: '',
    quote: '',
    quoteEs: '',
    quoteEn: '',
    note: '',
    noteEs: '',
    noteEn: '',
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
  adminReturnTo = '/admin';
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
    this.adminReturnTo = this.normalizeAdminReturnTo(this.route.snapshot.queryParamMap.get('returnTo'));
    this.restoreDashboardSection();
    this.restorePreviewVisibility();
    this.restoreAdminSidebarVisibility();
    this.loadRelationTypes();
    this.loadTags();

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

  ngDoCheck(): void {
    if (!this.isActiveSection('section-preview')) {
      return;
    }

    this.syncPreviewEntityModel();
  }

  scrollToSection(sectionId: DashboardSectionId) {
    this.activeDashboardSection = sectionId;
    this.persistDashboardSection(sectionId);
    if (sectionId === 'section-preview') {
      this.schedulePreviewRefresh();
    }
    this.cdr.markForCheck();
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
    this.translationForms.es.title = value;

    if (!this.slugTouched) {
      this.form.slug = this.slugify(value);
    }
  }

  onSlugChange(value: string) {
    this.slugTouched = true;
    this.form.slug = this.slugify(value);
  }

  setActiveTranslationLocale(locale: AdminLocale): void {
    this.activeTranslationLocale = locale;
    this.translationMessage = '';
    this.translationError = '';
    this.cdr.markForCheck();
  }

  activeTranslationForm(): AdminTranslationForm {
    return this.translationForms[this.activeTranslationLocale];
  }

  translationStatus(locale: AdminLocale): TranslationCompleteness {
    const form = this.translationForms[locale];
    const fields = [form.title, form.shortDescription, form.essay, form.notes, form.excerpt]
      .map((value) => (value ?? '').trim());
    const filled = fields.filter(Boolean).length;

    if (!filled) {
      return 'missing';
    }

    return form.title.trim() && (form.shortDescription.trim() || form.excerpt.trim()) && form.essay.trim()
      ? 'complete'
      : 'partial';
  }

  translationStatusLabel(locale: AdminLocale): string {
    const status = this.translationStatus(locale);
    if (status === 'complete') return 'Complete';
    if (status === 'partial') return 'Partial';
    return 'Missing';
  }

  translationStatusMark(locale: AdminLocale): string {
    const status = this.translationStatus(locale);
    if (status === 'complete') return '✓';
    if (status === 'partial') return '◐';
    return '○';
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
    const spanish = this.translationForms.es;
    const title = spanish.title.trim() || (this.form.title ?? '').trim();
    const summary = spanish.shortDescription.trim() || spanish.excerpt.trim() || (this.form.summary ?? '').trim();
    const content = spanish.essay.trim() || (this.form.content ?? '').trim();

    return {
      type: this.form.type,
      title,
      slug: (this.form.slug ?? '').trim(),
      summary: summary || undefined,
      content: content || undefined,
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

  private createEmptyTranslationForm(): AdminTranslationForm {
    return { title: '', shortDescription: '', essay: '', notes: '', excerpt: '' };
  }

  private createEmptyLocalizedDetailsForm(): AdminLocalizedDetailsForm {
    return {
      authorNation: '',
      technique: '',
      materials: '',
      dimensions: '',
      location: '',
      collection: '',
      state: '',
      country: '',
      city: '',
      disciplines: '',
      bioShort: '',
      links: '',
      definition: '',
    };
  }

  activeLocalizedDetailsForm(): AdminLocalizedDetailsForm {
    if (this.activeTranslationLocale === 'es') {
      return this.detailsForm as AdminLocalizedDetailsForm;
    }

    return this.localizedDetailForms[this.activeTranslationLocale];
  }

  private applyTranslations(entity: AdminEntityResponse): void {
    const next: Record<AdminLocale, AdminTranslationForm> = {
      es: {
        title: entity.title ?? '',
        shortDescription: entity.summary ?? '',
        essay: entity.content ?? '',
        notes: '',
        excerpt: entity.summary ?? '',
      },
      en: this.createEmptyTranslationForm(),
    };

    for (const translation of entity.translations ?? []) {
      const locale = translation.locale === 'en' ? 'en' : translation.locale === 'es' ? 'es' : null;
      if (!locale) continue;

      next[locale] = {
        title: translation.title ?? '',
        shortDescription: translation.shortDescription ?? '',
        essay: translation.essay ?? '',
        notes: translation.notes ?? '',
        excerpt: translation.excerpt ?? '',
      };
    }

    this.translationForms = next;
  }

  private applyLocalizedDetailTranslations(entity: AdminEntityResponse): void {
    this.localizedDetailForms = {
      es: this.extractLocalizedDetailsForm(entity, 'es'),
      en: this.extractLocalizedDetailsForm(entity, 'en'),
    };
  }

  private extractLocalizedDetailsForm(entity: AdminEntityResponse, locale: AdminLocale): AdminLocalizedDetailsForm {
    if (locale === 'es') {
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
        disciplines: entity?.artist?.disciplines ?? '',
        bioShort: entity?.artist?.bioShort ?? '',
        links: entity?.artist?.links ?? '',
        definition: entity?.concept?.definition ?? entity?.period?.definition ?? '',
      };
    }

    const artworkTranslation = entity?.artwork?.translations?.find((item: any) => item?.locale === locale) ?? null;
    const artistTranslation = entity?.artist?.translations?.find((item: any) => item?.locale === locale) ?? null;
    const conceptTranslation = entity?.concept?.translations?.find((item: any) => item?.locale === locale) ?? null;
    const periodTranslation = entity?.period?.translations?.find((item: any) => item?.locale === locale) ?? null;

    return {
      authorNation: artworkTranslation?.authorNation ?? '',
      technique: artworkTranslation?.technique ?? '',
      materials: artworkTranslation?.materials ?? '',
      dimensions: artworkTranslation?.dimensions ?? '',
      location: artworkTranslation?.location ?? '',
      collection: artworkTranslation?.collection ?? '',
      state: artworkTranslation?.state ?? '',
      country: artistTranslation?.country ?? '',
      city: artistTranslation?.city ?? '',
      disciplines: artistTranslation?.disciplines ?? '',
      bioShort: artistTranslation?.bioShort ?? '',
      links: artistTranslation?.links ?? '',
      definition: conceptTranslation?.definition ?? periodTranslation?.definition ?? '',
    };
  }

  private buildLocalizedDetailsPayload(locale: AdminLocale): AdminEntityDetailsPayload | undefined {
    const form = locale === 'es' ? (this.detailsForm as AdminLocalizedDetailsForm) : this.localizedDetailForms[locale];
    const payload: AdminEntityDetailsPayload = {
      authorNation: String(form.authorNation ?? '').trim() || undefined,
      technique: String(form.technique ?? '').trim() || undefined,
      materials: String(form.materials ?? '').trim() || undefined,
      dimensions: String(form.dimensions ?? '').trim() || undefined,
      location: String(form.location ?? '').trim() || undefined,
      collection: String(form.collection ?? '').trim() || undefined,
      state: String(form.state ?? '').trim() || undefined,
      country: String(form.country ?? '').trim() || undefined,
      city: String(form.city ?? '').trim() || undefined,
      disciplines: String(form.disciplines ?? '').trim() || undefined,
      bioShort: String(form.bioShort ?? '').trim() || undefined,
      links: String(form.links ?? '').trim() || undefined,
      definition: String(form.definition ?? '').trim() || undefined,
    };

    return Object.values(payload).some((value) => value !== undefined && value !== null && String(value).trim() !== '') ? payload : undefined;
  }

  private buildTranslationPayload(locale: AdminLocale): AdminEntityTranslationPayload {
    const form = this.translationForms[locale];
    return {
      title: form.title.trim(),
      shortDescription: form.shortDescription.trim() || null,
      essay: form.essay.trim() || null,
      notes: form.notes.trim() || null,
      excerpt: form.excerpt.trim() || null,
      details: this.buildLocalizedDetailsPayload(locale),
    };
  }

  saveActiveTranslation(): void {
    if (!this.isEdit || !this.entityId) {
      this.translationError = 'Guarda primero la entity antes de editar traducciones.';
      return;
    }

    const locale = this.activeTranslationLocale;
    const payload = this.buildTranslationPayload(locale);

    if (!payload.title) {
      this.translationError = 'El título de la traducción es obligatorio.';
      return;
    }

    this.translationSaving = true;
    this.translationMessage = 'Guardando traducción...';
    this.translationError = '';
    this.cdr.markForCheck();

    this.adminApi.upsertTranslation(this.entityId, locale, payload).subscribe({
      next: (entity) => {
        this.translationSaving = false;
        this.translationMessage = 'Traducción guardada.';
        this.applyEntityResponse(entity);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.translationSaving = false;
        this.translationMessage = '';
        this.translationError = err?.error?.message ?? 'No se pudo guardar la traducción.';
        this.cdr.markForCheck();
      },
    });
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

    this.applyTranslations(entity);
    this.applyMediaLibraryState(entity, preserveDirtyMediaEditors, clearedEditorId);
    this.persistedResolvedMedia = entity.resolvedMedia ?? null;
    this.detailsForm = this.extractDetailsForm(entity);
    this.applyLocalizedDetailTranslations(entity);
    this.sourceRefs = Array.isArray(entity.sourceRefs)
      ? entity.sourceRefs.map((ref: any) => this.normalizeSourceRef(ref))
      : [];
    this.contributors = Array.isArray(entity.contributors)
      ? entity.contributors.map((contributor: any) => this.normalizeContributor(contributor))
      : [];
    this.entityTags = Array.isArray(entity.tags) ? entity.tags : [];
    this.syncPreviewEntityModel(true);
    this.schedulePreviewRefresh();
  }

  private loadRelationTypes() {
    this.relationTypesLoading = true;
    this.relationTypesApi.list().subscribe({
      next: (types) => {
        this.relationTypes = types;
        const preferred = types.find((type) => type.key === this.newRelation.type) ?? types[0] ?? null;
        this.newRelation.relationTypeId = preferred?.id ?? '';
        this.newRelation.type = preferred?.key ?? this.newRelation.type;
        this.relationTypesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.relationTypes = [];
        this.relationTypesLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadTags() {
    this.tagsLoading = true;
    this.tagsApi.list().subscribe({
      next: (tags) => {
        this.availableTags = tags;
        this.tagsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.availableTags = [];
        this.tagsLoading = false;
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
      this.entitySaveState = 'error';
      return;
    }

    this.saving = true;
    this.entitySaveState = 'saving';
    this.successMessage = 'Guardando cambios en el backend...';
    this.cdr.markForCheck();

    const req$ = this.isEdit
      ? this.adminApi.update(this.entityId, payload)
      : this.adminApi.create(payload);

    req$.subscribe({
      next: (entity) => {
        this.saving = false;
        this.entitySaveState = 'saved';
        this.entityLastSavedAt = new Date();
        this.successMessage = this.isEdit
          ? 'Entity actualizada correctamente.'
          : 'Entity creada correctamente.';

        if (entity && this.isEdit) {
          this.applyEntityResponse(entity);
        }

        this.cdr.markForCheck();

        if (mode === 'stay') {
          if (!this.isEdit && entity?.id) {
            this.router.navigate(['/admin/entities', entity.id, 'edit'], {
              queryParams: { returnTo: this.adminReturnTo },
            });
          }
          return;
        }

        setTimeout(() => {
          this.router.navigateByUrl(this.adminReturnTarget());
        }, 700);
      },
      error: (err) => {
        this.saving = false;
        this.entitySaveState = 'error';
        this.errorMessage = err?.error?.message ?? 'No se pudo guardar la entity';
        this.successMessage = '';
        this.cdr.markForCheck();
      },
    });
  }

  entitySaveButtonLabel(mode: 'back' | 'stay'): string {
    if (this.saving && this.submitMode === mode) {
      return 'Guardando...';
    }

    if (this.entitySaveState === 'saved') {
      return mode === 'stay' ? 'Guardado' : 'Guardar';
    }

    return mode === 'stay' ? 'Guardar y seguir' : 'Guardar';
  }

  entitySaveStatusLabel(): string {
    if (this.saving || this.entitySaveState === 'saving') {
      return 'Guardando cambios...';
    }

    if (this.entitySaveState === 'saved' && this.entityLastSavedAt) {
      return `Guardado a las ${this.entityLastSavedAt.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`;
    }

    if (this.entitySaveState === 'error') {
      return 'El último guardado falló';
    }

    return this.isEdit ? 'Listo para guardar' : 'Crea la entity para activar el resto';
  }

  entitySaveStatusClass(): string {
    if (this.saving || this.entitySaveState === 'saving') {
      return 'entity-save-status entity-save-status--saving';
    }

    if (this.entitySaveState === 'saved') {
      return 'entity-save-status entity-save-status--saved';
    }

    if (this.entitySaveState === 'error') {
      return 'entity-save-status entity-save-status--error';
    }

    return 'entity-save-status';
  }

  private normalizeAdminReturnTo(value: string | null): string {
    if (!value || !value.startsWith('/admin')) {
      return '/admin';
    }

    if (value.startsWith('/admin/entities/') || value.includes('://')) {
      return '/admin';
    }

    return value;
  }

  navigateToAdminReturn() {
    this.router.navigateByUrl(this.adminReturnTarget());
  }

  adminReturnHref(): string {
    return this.adminReturnTarget();
  }

  private adminReturnTarget(): string {
    if (this.adminReturnTo !== '/admin') {
      return this.adminReturnTo;
    }

    return this.isEdit && this.form.type
      ? `/admin/entities?type=${encodeURIComponent(this.form.type)}`
      : '/admin';
  }

  loadRelations() {
    if (!this.entityId) return;

    this.relationsLoading = true;

    this.adminApi.listRelations(this.entityId).subscribe({
      next: (rows) => {
        this.relations = rows;
        this.relationsLoading = false;
        this.syncPreviewEntityModel(true);
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
        this.syncPreviewEntityModel(true);
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

  onRelationTypeChange(relationTypeId: string) {
    const relationType = this.relationTypes.find((item) => item.id === relationTypeId);
    this.newRelation.relationTypeId = relationType?.id ?? '';
    this.newRelation.type = relationType?.key ?? this.newRelation.type;
  }

  addRelation() {
    if (!this.entityId || !this.newRelation.toId || !this.newRelation.type.trim()) {
      return;
    }

    this.adminApi.createRelation(this.entityId, {
      toId: this.newRelation.toId,
      type: this.newRelation.type.trim(),
      relationTypeId: this.newRelation.relationTypeId || undefined,
        justificationEs: this.newRelation.justificationEs.trim() || undefined,
      justificationEn: this.newRelation.justificationEn.trim() || undefined,
    }).subscribe({
      next: () => {
        const preferred = this.relationTypes.find((type) => type.key === 'RELATED_TO') ?? this.relationTypes[0] ?? null;
        this.newRelation = {
          toId: '',
          type: preferred?.key ?? 'RELATED_TO',
          relationTypeId: preferred?.id ?? '',
          justificationEs: '',
          justificationEn: '',
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

  addSelectedTag() {
    if (!this.entityId || !this.selectedTagId || this.tagsSaving) return;

    this.tagsSaving = true;
    this.tagsMessage = '';
    this.tagsError = '';

    this.tagsApi.addToEntity(this.entityId, this.selectedTagId).subscribe({
      next: (entityTag) => {
        this.tagsSaving = false;
        this.selectedTagId = '';
        this.upsertEntityTag(entityTag);
        this.tagsMessage = 'Tag añadido.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.tagsSaving = false;
        this.tagsError = err?.error?.message ?? 'No se pudo añadir el tag.';
        this.cdr.markForCheck();
      },
    });
  }

  createTagAndAttach() {
    const label = this.newTagLabel.trim();
    if (!this.entityId || !label || this.tagsSaving) return;

    this.tagsSaving = true;
    this.tagsMessage = '';
    this.tagsError = '';

    this.tagsApi.create({
      label,
      category: this.newTagCategory.trim() || undefined,
    }).subscribe({
      next: (tag) => {
        this.availableTags = [...this.availableTags, tag].sort((a, b) => a.label.localeCompare(b.label));
        this.newTagLabel = '';
        this.newTagCategory = '';
        this.tagsApi.addToEntity(this.entityId, tag.id).subscribe({
          next: (entityTag) => {
            this.tagsSaving = false;
            this.upsertEntityTag(entityTag);
            this.tagsMessage = 'Tag creado y añadido.';
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.tagsSaving = false;
            this.tagsError = err?.error?.message ?? 'Tag creado, pero no se pudo añadir a la entity.';
            this.cdr.markForCheck();
          },
        });
      },
      error: (err) => {
        this.tagsSaving = false;
        this.tagsError = err?.error?.message ?? 'No se pudo crear el tag.';
        this.cdr.markForCheck();
      },
    });
  }

  removeTag(tagId: string) {
    if (!this.entityId || this.tagsSaving) return;

    this.tagsSaving = true;
    this.tagsMessage = '';
    this.tagsError = '';

    this.tagsApi.removeFromEntity(this.entityId, tagId).subscribe({
      next: () => {
        this.tagsSaving = false;
        this.entityTags = this.entityTags.filter((entityTag) => entityTag.tagId !== tagId && entityTag.tag?.id !== tagId);
        this.tagsMessage = 'Tag quitado.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.tagsSaving = false;
        this.tagsError = err?.error?.message ?? 'No se pudo quitar el tag.';
        this.cdr.markForCheck();
      },
    });
  }

  tagAlreadySelected(tagId: string): boolean {
    return this.entityTags.some((entityTag) => entityTag.tagId === tagId || entityTag.tag?.id === tagId);
  }

  availableTagsToAttach(): Tag[] {
    return this.availableTags.filter((tag) => tag.isActive && !this.tagAlreadySelected(tag.id));
  }

  saveRelation(rel: any) {
    if (!this.entityId) return;

    this.adminApi.updateRelation(this.entityId, rel.id, {
      relationTypeId: rel.relationTypeId || rel.relationType?.id || undefined,
      type: rel.type || rel.relationTypeKey || undefined,
      justificationEs: String(rel.justificationEs ?? rel.justification ?? '').trim() || undefined,
      justificationEn: String(rel.justificationEn ?? '').trim() || undefined,
      weight: rel.weight ?? undefined,
    }).subscribe({
      next: (updated) => {
        this.relations = this.relations.map((item) => item.id === updated.id ? updated : item);
        this.incomingRelations = this.incomingRelations.map((item) => item.id === updated.id ? updated : item);
        this.syncPreviewEntityModel(true);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'No se pudo actualizar la relación';
        this.cdr.markForCheck();
      },
    });
  }

  removeRelation(relationId: string) {
    if (!this.entityId) return;

    const ok = window.confirm('¿Quitar esta relación?');
    if (!ok) return;

    const previousRelations = [...this.relations];
    const previousIncomingRelations = [...this.incomingRelations];
    this.relations = this.relations.filter((relation) => relation.id !== relationId);
    this.incomingRelations = this.incomingRelations.filter((relation) => relation.id !== relationId);
    this.cdr.markForCheck();

    this.adminApi.deleteRelation(this.entityId, relationId).subscribe({
      next: () => {
        this.cdr.markForCheck();
      },
      error: () => {
        this.relations = previousRelations;
        this.incomingRelations = previousIncomingRelations;
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
        this.applyLocalizedDetailTranslations(entity);
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
          quoteEs: '',
          quoteEn: '',
          note: '',
          noteEs: '',
          noteEn: '',
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

  get mainVisualSlots(): VisualSlot[] {
    return this.visualSlots;
  }

  get coverageCards() {
    return this.mainVisualSlots.map((slot) => ({
      ...slot,
      countLabel: this.mediaCoverageSummary?.coveredSlots.includes(slot.key)
        ? 'Cubierto'
        : 'Pendiente',
    }));
  }

  get coverageSummaryCards(): Array<{ label: string; value: string; tone?: 'warning' | 'ok' | 'neutral' }> {
    const summary = this.mediaCoverageSummary;
    if (!summary) {
      return [];
    }

    return [
      {
        label: 'Slots cubiertos',
        value: `${summary.coveredSlots.length}/4`,
        tone: summary.emptySlots.length ? 'warning' : 'ok',
      },
      {
        label: 'Fallbacks activos',
        value: String(summary.fallbackSlots.length),
        tone: summary.fallbackSlots.length ? 'neutral' : 'ok',
      },
      {
        label: 'Assets en biblioteca',
        value: String(summary.assetCount),
        tone: 'neutral',
      },
      {
        label: 'Sin uso',
        value: String(summary.unusedAssetCount),
        tone: summary.unusedAssetCount ? 'neutral' : 'ok',
      },
    ];
  }

  get coverageHealthLabel(): string {
    if (this.mediaCoverageSummary?.emptySlots.length) {
      return 'Cobertura incompleta';
    }

    if (this.mediaWarnings.length) {
      return 'Cobertura revisable';
    }

    return 'Cobertura lista';
  }

  get coverageHealthTone(): 'warning' | 'ok' {
    return this.mediaCoverageSummary?.emptySlots.length || this.mediaWarnings.length ? 'warning' : 'ok';
  }

  get primaryPreviewSlot(): VisualSlot | null {
    return this.mainVisualSlots.find((slot) => slot.key === 'detail')
      ?? this.mainVisualSlots.find((slot) => slot.key === 'list')
      ?? this.mainVisualSlots[0]
      ?? null;
  }

  get mainUsedEditors(): EditableAdminMediaEditor[] {
    return this.mediaEditors.filter((editor) => this.activeSlotLabels(editor.persisted).length > 0);
  }

  get additionalMediaEditors(): EditableAdminMediaEditor[] {
    const assignmentIds = new Set(this.additionalMediaItems.map((item) => item.assignmentId));
    return this.mediaEditors.filter((editor) => assignmentIds.has(editor.id));
  }

  get derivedEditors(): EditableAdminMediaEditor[] {
    const activeIds = new Set(this.mainUsedEditors.map((editor) => editor.id));
    const additionalIds = new Set(this.additionalMediaEditors.map((editor) => editor.id));

    return this.mediaEditors.filter((editor) => {
      if (activeIds.has(editor.id) || additionalIds.has(editor.id)) {
        return false;
      }

      return editor.persisted.media.originType === 'INGESTED'
        || !!editor.persisted.media.derivedFromMediaId
        || this.hasPromotedVisualReplacement(editor.persisted)
        || !!this.replacementIngestedLink(editor.persisted);
    });
  }

  get unusedEditors(): EditableAdminMediaEditor[] {
    const excludedIds = new Set([
      ...this.mainUsedEditors.map((editor) => editor.id),
      ...this.additionalMediaEditors.map((editor) => editor.id),
      ...this.derivedEditors.map((editor) => editor.id),
    ]);

    return this.mediaEditors.filter((editor) => !excludedIds.has(editor.id));
  }

  get libraryManagedCount(): number {
    return this.mainUsedEditors.length
      + this.derivedEditors.length
      + this.unusedEditors.length
      + this.additionalMediaEditors.length;
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

  get activeMediaEditor(): EditableAdminMediaEditor | null {
    if (!this.mediaEditors.length) {
      return null;
    }

    return this.mediaEditors.find((editor) => editor.id === this.activeMediaEditorId) ?? this.mediaEditors[0] ?? null;
  }

  mediaLibraryViewCount(viewId: MediaLibraryViewId): string {
    switch (viewId) {
      case 'coverage':
        return `${this.mediaCoverageSummary?.coveredSlots.length ?? 0}/4`;
      case 'library':
        return String(this.libraryManagedCount);
      case 'add':
        return this.mediaEditors.length ? 'Listo' : 'Vacío';
    }
  }

  mediaLibraryViewClass(viewId: MediaLibraryViewId): string {
    return `admin-dashboard-nav__item media-library-nav__item${this.activeMediaLibraryView === viewId ? ' is-active' : ''}`;
  }

  setMediaLibraryView(viewId: MediaLibraryViewId) {
    this.activeMediaLibraryView = viewId;
    this.cdr.markForCheck();
  }

  slotResolutionLabel(slot: VisualSlot): string {
    if (slot.state.source === 'explicit') {
      return slot.state.explanation;
    }

    if (slot.state.source === 'fallback') {
      return slot.state.explanation;
    }

    if (slot.state.source === 'legacy') {
      return slot.state.explanation;
    }

    return 'No hay media resuelta para este contexto';
  }

  slotStateClass(slot: VisualSlot): string {
    switch (slot.state.source) {
      case 'explicit':
        return 'media-pill--slot-explicit';
      case 'fallback':
        return 'media-pill--slot-fallback';
      case 'legacy':
        return 'media-pill--legacy';
      default:
        return 'media-pill--slot-empty';
    }
  }

  slotPreviewEyebrow(slot: VisualSlot): string {
    switch (slot.key) {
      case 'explorer3d':
        return 'Inmersivo';
      case 'list':
        return 'Lista y grids';
      case 'detail':
        return 'Detalle';
      case 'preview':
        return 'Preview contextual';
      default:
        return 'Media';
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

    const payload = this.buildMediaUpdatePayload(editor.draft);

    if (!payload) {
      return;
    }

    editor.saveState = 'saving';
    editor.errorMessage = '';

    this.adminApi.updateMedia(this.entityId, link.id, payload).subscribe({
      next: () => {
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
    const previousPersistedMediaLinks = [...this.persistedMediaLinks];
    const previousMediaEditors = this.mediaEditors.map((candidate) => ({
      ...candidate,
      persisted: this.cloneMediaLink(candidate.persisted),
      draft: this.cloneMediaLink(candidate.draft),
    }));
    const previousResolvedVisualSlots = this.resolvedVisualSlots.map((slot) => ({
      ...slot,
      state: {
        ...slot.state,
        item: slot.state.item ? { ...slot.state.item } : null,
      },
    }));
    const previousAdditionalMediaItems = this.additionalMediaItems.map((item) => ({
      ...item,
      item: item.item ? { ...item.item } : item.item,
    }));
    const previousWarningsDetailed = this.mediaWarningsDetailed.map((warning) => ({ ...warning }));
    const previousWarningMessages = [...this.mediaWarningMessages];
    const previousCoverageSummary = this.mediaCoverageSummary
      ? {
        ...this.mediaCoverageSummary,
        coveredSlots: [...this.mediaCoverageSummary.coveredSlots],
        emptySlots: [...this.mediaCoverageSummary.emptySlots],
        fallbackSlots: [...this.mediaCoverageSummary.fallbackSlots],
        explicitSlots: [...this.mediaCoverageSummary.explicitSlots],
        legacySlots: [...this.mediaCoverageSummary.legacySlots],
      }
      : null;
    const previousActiveMediaEditorId = this.activeMediaEditorId;

    this.persistedMediaLinks = this.persistedMediaLinks.filter((candidate) => candidate.id !== link.id);
    this.mediaEditors = this.mediaEditors.filter((candidate) => candidate.id !== link.id);
    this.additionalMediaItems = this.additionalMediaItems.filter((item) => item.assignmentId !== link.id);
    if (!this.activeMediaEditorId || this.activeMediaEditorId === link.id) {
      this.activeMediaEditorId = this.mediaEditors[0]?.id ?? null;
    }
    this.syncPreviewEntityModel(true);
    this.cdr.markForCheck();

    this.adminApi.deleteMedia(this.entityId, link.id).subscribe({
      next: () => {
        this.mediaMessage = 'Asociación de media eliminada.';
        this.refreshMediaLibrary(true, editor.id);
      },
      error: (err) => {
        this.persistedMediaLinks = previousPersistedMediaLinks;
        this.mediaEditors = previousMediaEditors;
        this.resolvedVisualSlots = previousResolvedVisualSlots;
        this.additionalMediaItems = previousAdditionalMediaItems;
        this.mediaWarningsDetailed = previousWarningsDetailed;
        this.mediaWarningMessages = previousWarningMessages;
        this.mediaCoverageSummary = previousCoverageSummary;
        this.activeMediaEditorId = previousActiveMediaEditorId;
        this.syncPreviewEntityModel(true);
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
      `El asset INGESTED asumirá ${sourceRoleLabel}, sortOrder, isPrimary, displayMode y focales del externo del que deriva. El externo quedará visible como Additional Media. ¿Continuar?`,
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
        this.mediaMessage = 'El asset INGESTED ocupa ahora el papel visual del externo. El asset externo sigue visible como Additional Media.';
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
      `El asset EXTERNAL_URL recuperará ${ingestedRoleLabel}, sortOrder, isPrimary, displayMode y focales. El INGESTED seguirá visible como Additional Media. ¿Continuar?`,
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
        this.mediaMessage = 'El asset externo recupera ahora el papel visual principal. El INGESTED sigue visible como Additional Media.';
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
    const editor = this.editorForLink(link);
    if (!editor || link.role === role) {
      return;
    }

    link.role = role;
    this.markEditorDirty(editor);
    this.cdr.markForCheck();
  }

  toggleLegacyFallback(link: EditableAdminMediaLink) {
    const editor = this.editorForLink(link);
    if (!editor) {
      return;
    }

    const nextValue = !editor.draft.isPrimary;
    editor.draft.isPrimary = nextValue;
    this.markEditorDirty(editor);

    if (nextValue) {
      for (const candidate of this.mediaEditors) {
        if (candidate.id === editor.id || !candidate.draft.isPrimary) {
          continue;
        }

        candidate.draft.isPrimary = false;
        this.markEditorDirty(candidate);
      }
    }

    this.cdr.markForCheck();
  }

  discardMediaChanges(link: EditableAdminMediaLink) {
    const editor = this.editorForLink(link);
    if (!editor || editor.saveState === 'saving') {
      return;
    }

    editor.draft = this.cloneMediaLink(editor.persisted);
    editor.isDirty = false;
    editor.saveState = 'idle';
    editor.errorMessage = '';
    this.cdr.markForCheck();
  }

  slotStatusLabel(slot: VisualSlot): string {
    switch (slot.state.source) {
      case 'explicit':
        return 'Explícito';
      case 'fallback':
        return `Fallback${slot.state.matchedRole ? ` · ${this.mediaRoleLabel(slot.state.matchedRole)}` : ''}`;
      case 'legacy':
        return 'Legacy';
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

  private buildPreviewEntity() {
    const mediaLinks = this.mediaEditors
      .map((editor) => this.mediaLinkToPreview(editor.draft))
      .filter((link): link is any => !!link);
    const locale = this.i18n.locale();
    const translation = this.translationForms[locale];
    const localizedDetails = locale === 'es'
      ? (this.detailsForm as AdminLocalizedDetailsForm)
      : this.localizedDetailForms[locale];

    return {
      id: this.entityId || 'draft-preview',
      type: this.form.type,
      title: (translation.title || this.form.title || 'Título de la entity').trim(),
      slug: this.form.slug || 'preview',
      summary: (translation.shortDescription || translation.excerpt || this.form.summary || '').trim() || null,
      content: (translation.essay || this.form.content || '').trim() || null,
      contentLevel: this.form.contentLevel || null,
      status: this.form.status,
      startYear: this.toNullableNumber(this.form.startYear),
      endYear: this.toNullableNumber(this.form.endYear),
      createdAt: new Date().toISOString(),
      mediaLinks,
      resolvedMedia: this.previewResolvedMedia(),
      tags: this.entityTags,
      outgoing: this.relations.map((rel) => this.previewRelation(rel, 'outgoing')),
      incoming: this.incomingRelations.map((rel) => this.previewRelation(rel, 'incoming')),
      sourceRefs: this.sourceRefs.map((ref) => ({
        id: ref.id ?? `${ref.sourceTitle}-${ref.page ?? ''}`,
        page: ref.page ?? null,
        quote: (locale === 'en' ? ref.quoteEn : ref.quoteEs) ?? ref.quote ?? null,
        note: (locale === 'en' ? ref.noteEn : ref.noteEs) ?? ref.note ?? null,
        source: {
          type: ref.sourceType ?? 'SOURCE',
          title: (locale === 'en' ? ref.sourceTitleEn : ref.sourceTitleEs) ?? ref.sourceTitle ?? 'Fuente editorial',
          author: (locale === 'en' ? ref.sourceAuthorEn : ref.sourceAuthorEs) ?? ref.sourceAuthor ?? null,
          publisher: (locale === 'en' ? ref.sourcePublisherEn : ref.sourcePublisherEs) ?? ref.sourcePublisher ?? null,
          year: ref.sourceYear ?? null,
        },
      })),
      contributors: this.contributors,
      artwork: this.form.type === 'ARTWORK' ? {
        technique: localizedDetails.technique || null,
        materials: localizedDetails.materials || null,
        dimensions: localizedDetails.dimensions || null,
        location: localizedDetails.location || null,
        collection: localizedDetails.collection || null,
        state: localizedDetails.state || null,
        authorNation: localizedDetails.authorNation || null,
      } : null,
      artist: this.form.type === 'ARTIST' ? {
        country: localizedDetails.country || null,
        city: localizedDetails.city || null,
        birthYear: this.detailsForm.birthYear ?? null,
        deathYear: this.detailsForm.deathYear ?? null,
        disciplines: localizedDetails.disciplines || null,
        links: localizedDetails.links || null,
        bioShort: localizedDetails.bioShort || null,
      } : null,
      concept: this.form.type === 'CONCEPT' ? {
        definition: localizedDetails.definition || null,
      } : null,
      period: this.form.type === 'PERIOD' ? {
        definition: localizedDetails.definition || null,
      } : null,
    };
  }

  private previewResolvedMedia() {
    const resolved: Record<string, any> = this.persistedResolvedMedia
      ? {
        ...this.persistedResolvedMedia,
        gallery: Array.isArray(this.persistedResolvedMedia.gallery)
          ? [...this.persistedResolvedMedia.gallery]
          : this.persistedResolvedMedia.gallery,
      }
      : {};
    const slotMap: Array<{ usage: 'hero' | 'card' | 'detail' | 'thumbnail' | 'explorer3d'; slotKey: MediaEditorSlotKey }> = [
      { usage: 'hero', slotKey: 'detail' },
      { usage: 'explorer3d', slotKey: 'explorer3d' },
      { usage: 'card', slotKey: 'list' },
      { usage: 'detail', slotKey: 'detail' },
      { usage: 'thumbnail', slotKey: 'preview' },
    ];

    for (const slot of slotMap) {
      const link = this.previewLinkForUsage(slot.usage);
      if (link) {
        resolved[slot.usage] = this.mediaLinkToResolvedPreview(link, slot.slotKey);
      } else if (slot.usage in resolved) {
        delete resolved[slot.usage];
      }
    }

    const primary = this.previewLinkForUsage('hero')
      ?? this.previewLinkForUsage('detail')
      ?? this.previewLinkForUsage('card')
      ?? this.previewLinkForUsage('thumbnail')
      ?? this.previewLinkForUsage('explorer3d');

    if (primary) {
      resolved['primary'] = this.mediaLinkToResolvedPreview(primary, 'detail');
    } else if ('primary' in resolved) {
      delete resolved['primary'];
    }

    const draftGallery = this.mediaEditors
      .map((editor) => editor.draft)
      .filter((link) => link.role === 'GALLERY')
      .map((link) => this.mediaLinkToResolvedPreview(link, 'detail'))
      .filter(Boolean);

    if (draftGallery.length) {
      resolved['gallery'] = draftGallery;
    } else if ('gallery' in resolved) {
      delete resolved['gallery'];
    }

    return Object.keys(resolved).length ? resolved : null;
  }

  private syncPreviewEntityModel(force = false): void {
    const nextStateKey = this.buildPreviewEntityStateKey();
    if (!force && nextStateKey === this.previewEntityStateKey) {
      return;
    }

    this.previewEntityStateKey = nextStateKey;
    this.previewEntityModel = this.buildPreviewEntity();
  }

  private schedulePreviewRefresh(): void {
    if (!this.isActiveSection('section-preview')) {
      return;
    }

    this.previewEntityModel = null;
    this.cdr.markForCheck();

    queueMicrotask(() => {
      this.syncPreviewEntityModel(true);
      this.cdr.markForCheck();
    });
  }

  private buildPreviewEntityStateKey(): string {
    return JSON.stringify({
      id: this.entityId || 'draft-preview',
      locale: this.i18n.locale(),
      form: this.form,
      translations: this.translationForms,
      details: this.detailsForm,
      localizedDetails: this.localizedDetailForms,
      tags: this.entityTags.map((tag: any) => ({
        id: tag?.id ?? tag?.tagId ?? tag?.tag?.id ?? null,
        label: tag?.label ?? tag?.tag?.label ?? null,
        slug: tag?.slug ?? tag?.tag?.slug ?? null,
      })),
      media: this.mediaEditors.map((editor) => ({
        id: editor.id,
        isDirty: editor.isDirty,
        draft: editor.draft,
      })),
      resolvedSlots: this.resolvedVisualSlots.map((slot) => ({
        key: slot.key,
        itemId: slot.state.item?.id ?? null,
        source: slot.state.source,
        matchedRole: slot.state.matchedRole,
      })),
      sourceRefs: this.sourceRefs,
      contributors: this.contributors,
      outgoing: this.relations.map((rel) => ({
        id: rel?.id ?? null,
        type: rel?.type ?? null,
        relationTypeId: rel?.relationTypeId ?? rel?.relationType?.id ?? null,
        relationTypeKey: rel?.relationTypeKey ?? rel?.relationType?.key ?? null,
        toId: rel?.to?.id ?? null,
        justification: rel?.justification ?? null,
        weight: rel?.weight ?? null,
      })),
      incoming: this.incomingRelations.map((rel) => ({
        id: rel?.id ?? null,
        type: rel?.type ?? null,
        relationTypeId: rel?.relationTypeId ?? rel?.relationType?.id ?? null,
        relationTypeKey: rel?.relationTypeKey ?? rel?.relationType?.key ?? null,
        fromId: rel?.from?.id ?? null,
        justification: rel?.justification ?? null,
        weight: rel?.weight ?? null,
      })),
    });
  }

  private previewLinkForSlot(slotKey: MediaEditorSlotKey): EditableAdminMediaLink | null {
    const usageBySlot: Record<MediaEditorSlotKey, 'card' | 'detail' | 'thumbnail' | 'explorer3d'> = {
      explorer3d: 'explorer3d',
      list: 'card',
      detail: 'detail',
      preview: 'thumbnail',
    };

    return this.previewLinkForUsage(usageBySlot[slotKey]);
  }

  private previewLinkForUsage(usage: 'hero' | 'card' | 'detail' | 'thumbnail' | 'explorer3d'): EditableAdminMediaLink | null {
    const exactRoleByUsage: Record<typeof usage, string> = {
      hero: 'HERO',
      explorer3d: 'EXPLORER_3D',
      card: 'CARD',
      detail: 'DETAIL',
      thumbnail: 'THUMBNAIL',
    };

    const exact = this.mediaEditors
      .map((editor) => editor.draft)
      .filter((link) => link.role === exactRoleByUsage[usage])
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))[0];

    if (exact) {
      return exact;
    }

    const resolvedItemId = usage === 'hero'
      ? this.persistedResolvedMedia?.hero?.id ?? this.persistedResolvedMedia?.detail?.id ?? null
      : this.resolvedVisualSlots.find((slot) => slot.key === ({
          explorer3d: 'explorer3d',
          card: 'list',
          detail: 'detail',
          thumbnail: 'preview',
        } as const)[usage])?.state.item?.id ?? null;

    if (resolvedItemId) {
      const byResolvedAsset = this.mediaEditors
        .map((editor) => editor.draft)
        .find((link) => link.media.id === resolvedItemId);

      if (byResolvedAsset) {
        return byResolvedAsset;
      }
    }

    return this.mediaEditors
      .map((editor) => editor.draft)
      .find((link) => link.isPrimary)
      ?? this.mediaEditors[0]?.draft
      ?? null;
  }

  private mediaLinkToPreview(link: EditableAdminMediaLink | null | undefined) {
    if (!link?.media) {
      return null;
    }
    const media = link.media as any;

    return {
      id: link.id,
      role: link.role,
      sortOrder: this.toNullableNumber(link.sortOrder) ?? 0,
      isPrimary: !!link.isPrimary,
      displayMode: link.displayMode || null,
      focalX: this.toNullableNumber(link.focalX),
      focalY: this.toNullableNumber(link.focalY),
      media: {
        ...media,
        displayMode: link.displayMode || null,
        focalX: this.toNullableNumber(link.assetFocalX ?? media.assetFocalX ?? media.focalX),
        focalY: this.toNullableNumber(link.assetFocalY ?? media.assetFocalY ?? media.focalY),
      },
    };
  }

  private mediaLinkToResolvedPreview(link: EditableAdminMediaLink, slotKey: MediaEditorSlotKey) {
    const crop = link.slotCrops?.[slotKey];
    const media = link.media as any;

    return {
      ...media,
      role: link.role,
      sortOrder: this.toNullableNumber(link.sortOrder) ?? 0,
      isPrimary: !!link.isPrimary,
      displayMode: link.displayMode || null,
      focalX: this.toNullableNumber(link.focalX ?? link.assetFocalX ?? media.assetFocalX ?? media.focalX),
      focalY: this.toNullableNumber(link.focalY ?? link.assetFocalY ?? media.assetFocalY ?? media.focalY),
      cropX: this.toNullableNumber(crop?.x),
      cropY: this.toNullableNumber(crop?.y),
      cropZoom: this.toNullableNumber(crop?.zoom),
    };
  }

  private previewRelation(rel: any, direction: 'outgoing' | 'incoming') {
    const endpoint = direction === 'outgoing' ? rel.to : rel.from;
    const fallbackEndpoint = {
      id: `${rel.id ?? direction}-draft-endpoint`,
      slug: endpoint?.slug ?? 'preview',
      title: endpoint?.title ?? 'Entity relacionada',
      type: endpoint?.type ?? 'ENTITY',
    };

    return {
      ...rel,
      id: rel.id ?? `${direction}-${rel.type ?? 'relation'}`,
      type: rel.type ?? 'RELATED_TO',
      relationType: rel.relationType ?? null,
      relationTypeKey: rel.relationTypeKey ?? rel.relationType?.key ?? rel.type ?? 'RELATED_TO',
      relationTypeLabel: rel.relationTypeLabel ?? rel.relationType?.label ?? rel.type ?? 'RELATED_TO',
      justification: (this.i18n.locale() === 'en' ? rel.justificationEn : rel.justificationEs) ?? rel.justification ?? null,
      weight: rel.weight ?? null,
      from: direction === 'incoming' ? fallbackEndpoint : (rel.from ?? {
        id: this.entityId || 'draft-preview',
        slug: this.form.slug || 'preview',
        title: this.form.title || 'Título de la entity',
        type: this.form.type,
      }),
      to: direction === 'outgoing' ? fallbackEndpoint : (rel.to ?? {
        id: this.entityId || 'draft-preview',
        slug: this.form.slug || 'preview',
        title: this.form.title || 'Título de la entity',
        type: this.form.type,
      }),
    };
  }

  hasOtherPersistedLegacy(linkId: string): boolean {
    return this.persistedMediaLinks.some((link) => link.isPrimary && link.id !== linkId);
  }

  isActiveSection(sectionId: DashboardSectionId): boolean {
    return this.activeDashboardSection === sectionId;
  }

  sectionCount(sectionId: DashboardSectionId): string | null {
    switch (sectionId) {
      case 'section-content':
        return this.supportsTypedDetails() ? 'Base + ficha' : 'Base';
      case 'section-media':
        return this.isEdit ? String(this.persistedMediaLinks.length) : '—';
      case 'section-preview':
        return 'Detail';
      case 'section-sources':
        return this.isEdit ? String(this.sourceRefs.length) : '—';
      case 'section-contributors':
        return this.isEdit ? String(this.contributors.length) : '—';
      case 'section-relations':
        return this.isEdit ? String(this.relations.length + this.incomingRelations.length) : '—';
    }
  }

  sectionMeta(sectionId: DashboardSectionId): string {
    switch (sectionId) {
      case 'section-content':
        return this.supportsTypedDetails()
          ? 'Contenido principal y ficha específica'
          : 'Contenido principal de la entity';
      case 'section-media':
        return this.isEdit
          ? `${this.persistedMediaLinks.length} assets cargados`
          : 'Guarda la entity para habilitar media';
      case 'section-preview':
        return 'Vista pública compuesta';
      case 'section-sources':
        return this.isEdit
          ? `${this.sourceRefs.length} fuentes editoriales`
          : 'Disponible tras guardar';
      case 'section-contributors':
        return this.isEdit
          ? `${this.contributors.length} créditos y participantes`
          : 'Disponible tras guardar';
      case 'section-relations':
        return this.isEdit
          ? `${this.relations.length + this.incomingRelations.length} conexiones registradas`
          : 'Disponible tras guardar';
    }
  }

  sectionStatus(sectionId: DashboardSectionId): 'error' | 'saving' | 'ready' | 'locked' | null {
    switch (sectionId) {
      case 'section-content':
        if (this.errorMessage || this.detailsError) {
          return 'error';
        }
        if (this.saving || this.detailsSaving) {
          return 'saving';
        }
        return 'ready';
      case 'section-media':
        if (!this.isEdit) {
          return 'locked';
        }
        if (this.mediaError) {
          return 'error';
        }
        if (this.addingMedia || this.uploadingMedia || this.mediaEditors.some((editor) => editor.saveState === 'saving')) {
          return 'saving';
        }
        return 'ready';
      case 'section-preview':
        return 'ready';
      case 'section-sources':
        if (!this.isEdit) {
          return 'locked';
        }
        if (this.sourcesError) {
          return 'error';
        }
        return this.sourcesSaving ? 'saving' : 'ready';
      case 'section-contributors':
        if (!this.isEdit) {
          return 'locked';
        }
        if (this.contributorsError) {
          return 'error';
        }
        return this.contributorsSaving ? 'saving' : 'ready';
      case 'section-relations':
        if (!this.isEdit) {
          return 'locked';
        }
        if (this.errorMessage) {
          return 'error';
        }
        return this.relationsLoading || this.incomingRelationsLoading ? 'saving' : 'ready';
    }
  }

  sectionStatusLabel(sectionId: DashboardSectionId): string | null {
    switch (this.sectionStatus(sectionId)) {
      case 'error':
        return 'Error';
      case 'saving':
        return 'Activo';
      case 'locked':
        return 'Bloqueado';
      case 'ready':
        return 'Listo';
      default:
        return null;
    }
  }

  sectionStatusClass(sectionId: DashboardSectionId): string {
    switch (this.sectionStatus(sectionId)) {
      case 'error':
        return 'admin-section-pill admin-section-pill--error';
      case 'saving':
        return 'admin-section-pill admin-section-pill--saving';
      case 'locked':
        return 'admin-section-pill admin-section-pill--locked';
      default:
        return 'admin-section-pill';
    }
  }

  activeSectionTitle(): string {
    return this.dashboardSections.find((section) => section.id === this.activeDashboardSection)?.label ?? 'Contenido';
  }

  get sidebarToggleLabel(): string {
    return this.adminSidebarVisible ? 'Ocultar editor' : 'Mostrar editor';
  }

  togglePreviewPanel() {
    this.previewVisible = !this.previewVisible;
    this.persistPreviewVisibility();
    this.cdr.markForCheck();
  }

  toggleAdminSidebar() {
    this.adminSidebarVisible = !this.adminSidebarVisible;
    this.persistAdminSidebarVisibility();
    this.cdr.markForCheck();
  }

  private dashboardSectionStorageKey(): string {
    return `jano-admin-entity-section:${this.entityId || 'new'}`;
  }

  private restoreDashboardSection() {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem(this.dashboardSectionStorageKey()) as DashboardSectionId | null;
    if (!saved) {
      return;
    }

    if (this.dashboardSections.some((section) => section.id === saved)) {
      this.activeDashboardSection = saved;
    }
  }

  private persistDashboardSection(sectionId: DashboardSectionId) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.dashboardSectionStorageKey(), sectionId);
  }

  private previewVisibilityStorageKey(): string {
    return `jano-admin-entity-preview:${this.entityId || 'new'}`;
  }

  private adminSidebarStorageKey(): string {
    return `jano-admin-entity-sidebar:${this.entityId || 'new'}`;
  }

  private restorePreviewVisibility() {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem(this.previewVisibilityStorageKey());
    if (saved === null) {
      return;
    }

    this.previewVisible = saved !== 'hidden';
  }

  private restoreAdminSidebarVisibility() {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem(this.adminSidebarStorageKey());
    if (saved === null) {
      return;
    }

    this.adminSidebarVisible = saved !== 'hidden';
  }

  private persistPreviewVisibility() {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.previewVisibilityStorageKey(), this.previewVisible ? 'visible' : 'hidden');
  }

  private persistAdminSidebarVisibility() {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.adminSidebarStorageKey(), this.adminSidebarVisible ? 'visible' : 'hidden');
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
      sourceTitleEs: ref.source?.titleEs ?? ref.source?.title ?? '',
      sourceTitleEn: ref.source?.titleEn ?? '',
      sourceAuthor: ref.source?.author ?? '',
      sourceAuthorEs: ref.source?.authorEs ?? ref.source?.author ?? '',
      sourceAuthorEn: ref.source?.authorEn ?? '',
      sourcePublisher: ref.source?.publisher ?? '',
      sourcePublisherEs: ref.source?.publisherEs ?? ref.source?.publisher ?? '',
      sourcePublisherEn: ref.source?.publisherEn ?? '',
      sourceYear: ref.source?.year ?? null,
      sourceUrl: ref.source?.url ?? '',
      page: ref.page ?? '',
      quote: ref.quote ?? '',
      quoteEs: ref.quoteEs ?? ref.quote ?? '',
      quoteEn: ref.quoteEn ?? '',
      note: ref.note ?? '',
      noteEs: ref.noteEs ?? ref.note ?? '',
      noteEn: ref.noteEn ?? '',
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
      sourceTitleEs: String(source.sourceTitleEs ?? source.sourceTitle ?? '').trim() || undefined,
      sourceTitleEn: String(source.sourceTitleEn ?? '').trim() || undefined,
      sourceAuthor: String(source.sourceAuthor ?? source.sourceAuthorEs ?? '').trim() || undefined,
      sourceAuthorEs: String(source.sourceAuthorEs ?? source.sourceAuthor ?? '').trim() || undefined,
      sourceAuthorEn: String(source.sourceAuthorEn ?? '').trim() || undefined,
      sourcePublisher: String(source.sourcePublisher ?? source.sourcePublisherEs ?? '').trim() || undefined,
      sourcePublisherEs: String(source.sourcePublisherEs ?? source.sourcePublisher ?? '').trim() || undefined,
      sourcePublisherEn: String(source.sourcePublisherEn ?? '').trim() || undefined,
      sourceYear: this.toNullableNumber(source.sourceYear),
      sourceUrl: String(source.sourceUrl ?? '').trim() || undefined,
      page: String(source.page ?? '').trim() || undefined,
      quote: String(source.quote ?? source.quoteEs ?? '').trim() || undefined,
      quoteEs: String(source.quoteEs ?? source.quote ?? '').trim() || undefined,
      quoteEn: String(source.quoteEn ?? '').trim() || undefined,
      note: String(source.note ?? source.noteEs ?? '').trim() || undefined,
      noteEs: String(source.noteEs ?? source.note ?? '').trim() || undefined,
      noteEn: String(source.noteEn ?? '').trim() || undefined,
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

  private upsertEntityTag(entityTag: any) {
    const tagId = entityTag.tagId ?? entityTag.tag?.id;
    if (!tagId) return;

    const existingIndex = this.entityTags.findIndex((item) => (item.tagId ?? item.tag?.id) === tagId);
    if (existingIndex >= 0) {
      const next = [...this.entityTags];
      next[existingIndex] = entityTag;
      this.entityTags = next;
      return;
    }

    this.entityTags = [...this.entityTags, entityTag];
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
        saveState: clearedEditorId === persisted.id ? 'saved' : 'idle',
        errorMessage: '',
        removing: false,
        ingesting: false,
        promoting: false,
        restoring: false,
      };
    });

    if (!this.activeMediaEditorId || !this.mediaEditors.some((editor) => editor.id === this.activeMediaEditorId)) {
      this.activeMediaEditorId = this.mediaEditors[0]?.id ?? null;
    }

    this.resolvedVisualSlots = (library?.resolvedSlots ?? []).map((slot) => this.normalizeResolvedSlot(slot));
    this.additionalMediaItems = library?.additionalMedia ?? [];
    this.mediaWarningsDetailed = library?.warnings ?? [];
    this.mediaWarningMessages = this.mediaWarningsDetailed.map((warning) => warning.message);
    this.mediaCoverageSummary = library?.coverageSummary ?? null;

    if (!this.mediaEditors.length && !this.additionalMediaItems.length) {
      this.activeMediaLibraryView = 'add';
    } else if (!this.activeMediaLibraryView) {
      this.activeMediaLibraryView = 'coverage';
    }
  }

  slotWarningsForEditor(link: EditableAdminMediaLink): Partial<Record<MediaEditorSlotKey, string[]>> {
    const record: Partial<Record<MediaEditorSlotKey, string[]>> = {};

    for (const slot of this.resolvedVisualSlots) {
      if (slot.state.item?.id !== link.media.id) {
        continue;
      }

      const matches = this.mediaWarningsDetailed
        .filter((warning) => warning.code.startsWith(`media.${slot.key}_`))
        .map((warning) => warning.message);

      if (matches.length) {
        record[slot.key] = matches;
      }
    }

    return record;
  }

  selectMediaEditor(linkOrId: EditableAdminMediaLink | string | null | undefined) {
    this.activeMediaEditorId = typeof linkOrId === 'string' ? linkOrId : linkOrId?.id ?? null;
    this.cdr.markForCheck();
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
      assetFocalX: assignment.assetFocalX ?? asset.assetFocalX ?? asset.focalX ?? null,
      assetFocalY: assignment.assetFocalY ?? asset.assetFocalY ?? asset.focalY ?? null,
      slotCrops: this.normalizeSlotCrops(assignment.slotCrops),
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
      assetFocalX: link.media?.focalX ?? null,
      assetFocalY: link.media?.focalY ?? null,
      slotCrops: this.emptySlotCropMap(),
    }));
  }

  private normalizeResolvedSlot(slot: AdminResolvedSlot): VisualSlot {
    const definitions: Record<VisualSlot['key'], Omit<VisualSlot, 'state'>> = {
      explorer3d: { key: 'explorer3d', label: 'Explorer 3D', description: 'Imagen para la vista inmersiva.', previewUsage: 'explorer3d', previewClass: 'slot-preview--explorer' },
      list: { key: 'list', label: 'List', description: 'Imagen para listas, grids y railes.', previewUsage: 'card', previewClass: 'slot-preview--card' },
      detail: { key: 'detail', label: 'Detail', description: 'Imagen principal de la entidad.', previewUsage: 'detail', previewClass: 'slot-preview--detail' },
      preview: { key: 'preview', label: 'Preview', description: 'Imagen para previews contextuales.', previewUsage: 'thumbnail', previewClass: 'slot-preview--thumbnail' },
    };

    return {
      ...definitions[slot.slotKey],
      state: {
        item: slot.item,
        source: slot.source,
        matchedRole: slot.matchedRole,
        explanation: slot.explanation,
        reasonCode: slot.reasonCode,
      },
    };
  }

  private cloneMediaLink(link: EditableAdminMediaLink): EditableAdminMediaLink {
    return {
      ...link,
      slotCrops: this.cloneSlotCrops(link.slotCrops),
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
      return;
    }

    if (editor.isDirty && editor.saveState === 'saved') {
      editor.saveState = 'idle';
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
      assetFocalX: link.media?.focalX ?? null,
      assetFocalY: link.media?.focalY ?? null,
      slotCrops: this.emptySlotCropMap(),
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
      assetFocalX: this.toNullableNumber(source.assetFocalX),
      assetFocalY: this.toNullableNumber(source.assetFocalY),
      slotCrops: this.buildSlotCropPayload(source.slotCrops),
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
      assetFocalX: this.toNullableNumber(source.assetFocalX),
      assetFocalY: this.toNullableNumber(source.assetFocalY),
      slotCrops: this.buildSlotCropPayload(source.slotCrops),
    };
  }

  private buildMediaUpdatePayload(source: EditableAdminMediaLink): Partial<AdminEntityMediaPayload> | null {
    const payload: Partial<AdminEntityMediaPayload> = {
      alt: String(source.media.alt ?? '').trim() || undefined,
      source: String(source.media.source ?? '').trim() || undefined,
      photoBy: String(source.media.photoBy ?? '').trim() || undefined,
      license: String(source.media.license ?? '').trim() || undefined,
      role: source.role as AdminEntityMediaPayload['role'],
      sortOrder: Number(source.sortOrder ?? 0),
      isPrimary: !!source.isPrimary,
      displayMode: (source.displayMode || null) as AdminEntityMediaPayload['displayMode'],
      focalX: this.toNullableNumber(source.focalX),
      focalY: this.toNullableNumber(source.focalY),
      assetFocalX: this.toNullableNumber(source.assetFocalX),
      assetFocalY: this.toNullableNumber(source.assetFocalY),
      slotCrops: this.buildSlotCropPayload(source.slotCrops),
    };

    if (source.media.originType === 'EXTERNAL_URL') {
      const url = String(source.media.url ?? '').trim();
      if (!url) {
        this.mediaError = 'La URL de media es obligatoria.';
        this.cdr.markForCheck();
        return null;
      }

      payload.url = url;
      payload.displayUrl = String(source.media.displayUrl ?? '').trim() || undefined;
      payload.sourcePageUrl = String(source.media.sourcePageUrl ?? '').trim() || undefined;
    } else if (source.media.sourcePageUrl) {
      payload.sourcePageUrl = String(source.media.sourcePageUrl ?? '').trim() || undefined;
    }

    if (source.media.originType !== 'EXTERNAL_URL') {
      delete payload.url;
      delete payload.displayUrl;
    }

    return payload;
  }

  private normalizeSlotCrops(value: any): MediaSlotCropMap {
    return {
      explorer3d: this.normalizeCropValue(value?.explorer3d),
      list: this.normalizeCropValue(value?.list),
      detail: this.normalizeCropValue(value?.detail),
      preview: this.normalizeCropValue(value?.preview),
    };
  }

  private normalizeCropValue(value: any) {
    return {
      x: this.toNullableNumber(value?.x),
      y: this.toNullableNumber(value?.y),
      zoom: this.toNullableNumber(value?.zoom),
    };
  }

  private emptySlotCropMap(): MediaSlotCropMap {
    return {
      explorer3d: { x: null, y: null, zoom: null },
      list: { x: null, y: null, zoom: null },
      detail: { x: null, y: null, zoom: null },
      preview: { x: null, y: null, zoom: null },
    };
  }

  private cloneSlotCrops(slotCrops: MediaSlotCropMap | null | undefined): MediaSlotCropMap {
    return this.normalizeSlotCrops(slotCrops ?? this.emptySlotCropMap());
  }

  private buildSlotCropPayload(slotCrops: MediaSlotCropMap | null | undefined) {
    if (!slotCrops) {
      return undefined;
    }

    const keys: MediaEditorSlotKey[] = ['explorer3d', 'list', 'detail', 'preview'];
    const payload = keys.reduce((acc, key) => {
      const crop = slotCrops[key];
      const x = this.toNullableNumber(crop?.x);
      const y = this.toNullableNumber(crop?.y);
      const zoom = this.toNullableNumber(crop?.zoom);
      acc[key] = x === null && y === null && zoom === null ? null : { x, y, zoom };
      return acc;
    }, {} as Record<MediaEditorSlotKey, { x: number | null; y: number | null; zoom: number | null } | null>);

    return payload;
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
