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
  AdminCreateRelationPayload,
  AdminEntityAliasKind,
  AdminEntityAliasRecord,
  AdminEntityContributorRecord,
  AdminEntityResponse,
  AdminEntityRelationRecord,
  AdminEntitySearchListItem,
  AdminEntitySourceRefRecord,
  AdminEntityTagRecord,
  AdminEntitiesApi,
  AdminContributorPayload,
  AdminEntityDetailsPayload,
  AdminMediaCoverageSummary,
  AdminEntityPayload,
  AdminEntityTranslationPayload,
  AdminLocale,
  AdminMediaWarning,
  AdminSourceRefPayload,
} from '../../../core/api/admin-entities.api';
import { RelationType, RelationTypesApi } from '../../../core/api/relation-types.api';
import { Tag, TagsApi } from '../../../core/api/tags.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { EntityDetailViewComponent } from '../../entity/entity-detail-view.component';
import { PublicEntityPreview } from '../../../core/api/entities.models';
import { AdminEntityMediaGroupComponent } from './admin-entity-media-group.component';
import { AdminEntityLinkSuggestionsComponent } from './admin-entity-link-suggestions.component';
import { AdminEntitySidebarComponent } from './admin-entity-sidebar.component';
import type { AdminEntityDiscoverabilityItem } from './admin-entity-sidebar.component';
import {
  detectAdminEntityLinkMatch,
  insertAdminEntityLink,
} from './admin-entity-content-linking.presenter';
import { MediaAddPanelComponent } from './media-add-panel.component';
import { MediaCardEditorComponent } from './media-card-editor.component';
import {
  ADMIN_ENTITY_DASHBOARD_SECTIONS,
  AdminEntitySaveStatusViewModel,
  AdminEntitySidebarSectionItem,
  buildAdminEntitySaveStatusViewModel,
  buildAdminEntitySidebarSections,
  DashboardSectionId,
} from './admin-entity-shell.presenter';
import {
  AdminEntityPreviewBuildInput,
  AdminEntityPreviewConnection,
  AdminEntityPreviewLocalizedDetailsForm,
  AdminEntityPreviewTranslationForm,
  buildAdminEntityPreviewModel,
  buildAdminEntityPreviewStateKey,
  buildAdminPreviewKeyConnections,
} from './admin-entity-preview.presenter';
import {
  applyTranslations as applyContentTranslations,
  buildEntityPayload,
  buildTranslationPayload,
  contentFieldHint as contentFieldHintFromPresenter,
  contentFieldLabel as contentFieldLabelFromPresenter,
  createEmptyLocalizedDetailsForm,
  createEmptyTranslationForm,
  extractLocalizedDetailsForm,
  summaryFieldHint as summaryFieldHintFromPresenter,
  translationStatus as translationStatusFromPresenter,
  translationStatusLabel as translationStatusLabelFromPresenter,
  translationStatusMark as translationStatusMarkFromPresenter,
  TranslationCompleteness,
  typedDetailsSummary as typedDetailsSummaryFromPresenter,
} from './admin-entity-content.presenter';
import {
  AdminEntityRelationDraft,
  buildCreateRelationPayload,
  buildSelectedRelationSearchLabel,
  buildUpdateRelationPayload,
  canSubmitRelationDraft,
  createEmptyRelationDraft,
  filterRelationSearchResults,
  resolveRelationTypeSelection,
  shouldSearchRelationTargets,
} from './admin-entity-relations.presenter';
import {
  AdminEditableContributor,
  AdminEditableSourceRef,
  buildContributorPayload,
  buildSourceRefPayload,
  createEmptyContributorDraft,
  createEmptySourceRefDraft,
  normalizeContributor,
  normalizeSourceRef,
  upsertContributor,
  upsertSourceRef,
} from './admin-entity-metadata.presenter';
import {
  AdminEntityMediaLibraryViewModel,
  buildAdminEntityMediaLibraryViewModel,
  MediaLibraryViewId,
  mediaSlotResolutionLabel,
  mediaSlotStateClass,
  mediaSlotStatusLabel,
  VisualSlot,
} from './admin-entity-media.presenter';
import {
  AdminEntityMediaLibraryState,
  buildAdminEntityMediaLibraryState,
  buildMediaPayload as buildAdminMediaPayload,
  buildMediaUpdatePayload as buildAdminMediaUpdatePayload,
  buildUploadPayload as buildAdminUploadPayload,
  cloneMediaLink as cloneAdminMediaLink,
  cloneMediaLibraryState,
  mediaLinksEqual,
  removeMediaFromLibraryState,
} from './admin-entity-media.helpers';
import {
  EditableAdminMediaEditor,
  EditableAdminMediaLink,
  MEDIA_ROLE_LABELS,
  MediaAddExternalSubmit,
  MediaAddUploadSubmit,
  MediaEditorSlotKey,
} from './media-admin.models';

type EntitySaveState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  standalone: true,
  selector: 'app-admin-entity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    JanoMediaComponent,
    EntityDetailViewComponent,
    MediaAddPanelComponent,
    MediaCardEditorComponent,
    AdminEntityMediaGroupComponent,
    AdminEntitySidebarComponent,
    AdminEntityLinkSuggestionsComponent,
  ],
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

  linkSuggestions: AdminEntitySearchListItem[] = [];
  linkSearch = '';
  linkLoading = false;
  showLinkSuggestions = false;
  linkStartIndex = -1;
  previewEntityModel: PublicEntityPreview | null = null;
  private previewEntityStateKey = '';

  readonly dashboardSections = ADMIN_ENTITY_DASHBOARD_SECTIONS;
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
  translationForms: Record<AdminLocale, AdminEntityPreviewTranslationForm> = {
    es: this.createEmptyTranslationForm(),
    en: this.createEmptyTranslationForm(),
  };
  localizedDetailForms: Record<AdminLocale, AdminEntityPreviewLocalizedDetailsForm> = {
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
  persistedResolvedMedia: Record<string, unknown> | null = null;
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
  mediaLibraryModel: AdminEntityMediaLibraryViewModel = this.buildMediaLibraryModel();

  private linkSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  incomingRelations: AdminEntityRelationRecord[] = [];
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
  entityTags: AdminEntityTagRecord[] = [];
  entityAliases: AdminEntityAliasRecord[] = [];
  selectedTagId = '';
  newTagLabel = '';
  newTagCategory = '';
  tagsLoading = false;
  tagsSaving = false;
  tagsMessage = '';
  tagsError = '';
  aliasesSaving = false;
  aliasesMessage = '';
  aliasesError = '';
  newAliasValue = '';
  newAliasLocale: AdminLocale | 'und' = 'und';
  newAliasKind: AdminEntityAliasKind = 'COMMON_NAME';
  readonly aliasKinds: Array<{ value: AdminEntityAliasKind; label: string }> = [
    { value: 'COMMON_NAME', label: 'Nombre comun' },
    { value: 'ALTERNATE_TITLE', label: 'Titulo alternativo' },
    { value: 'TRANSLITERATION', label: 'Transliteracion' },
    { value: 'MISSPELLING', label: 'Error comun' },
    { value: 'NICKNAME', label: 'Apodo' },
    { value: 'SEARCH_HINT', label: 'Pista de busqueda' },
  ];

  relations: AdminEntityRelationRecord[] = [];
  relationSearch = '';
  relationResults: AdminEntitySearchListItem[] = [];
  relationLoading = false;
  relationsLoading = false;

  newRelation: AdminEntityRelationDraft = createEmptyRelationDraft([]);

  detailsSaving = false;
  detailsMessage = '';
  detailsError = '';
  detailsForm: AdminEntityDetailsPayload = {};

  sourceRefs: AdminEditableSourceRef[] = [];
  sourcesSaving = false;
  sourcesMessage = '';
  sourcesError = '';
  newSourceRef: AdminSourceRefPayload = createEmptySourceRefDraft();

  contributors: AdminEditableContributor[] = [];
  contributorsSaving = false;
  contributorsMessage = '';
  contributorsError = '';
  newContributor: AdminContributorPayload = createEmptyContributorDraft();

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

  statuses: NonNullable<AdminEntityPayload['status']>[] = ['DRAFT', 'IN_REVIEW', 'PUBLISHED'];

  levels: NonNullable<AdminEntityPayload['contentLevel']>[] = ['BASIC', 'INTERMEDIATE', 'ADVANCED'];

  saving = false;
  loading = false;
  initialEntityHydrated = false;
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
    this.adminReturnTo = this.normalizeAdminReturnTo(
      this.route.snapshot.queryParamMap.get('returnTo'),
    );
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
        next: (res) => {
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
      this.initialEntityHydrated = true;
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

    if (this.isEdit && !this.initialEntityHydrated) {
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

  activeTranslationForm(): AdminEntityPreviewTranslationForm {
    return this.translationForms[this.activeTranslationLocale];
  }

  translationStatus(locale: AdminLocale): TranslationCompleteness {
    return translationStatusFromPresenter(this.translationForms, locale);
  }

  translationStatusLabel(locale: AdminLocale): string {
    return translationStatusLabelFromPresenter(this.translationStatus(locale));
  }

  translationStatusMark(locale: AdminLocale): string {
    return translationStatusMarkFromPresenter(this.translationStatus(locale));
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
    return buildEntityPayload(this.form, this.translationForms);
  }

  private createEmptyTranslationForm(): AdminEntityPreviewTranslationForm {
    return createEmptyTranslationForm();
  }

  private createEmptyLocalizedDetailsForm(): AdminEntityPreviewLocalizedDetailsForm {
    return createEmptyLocalizedDetailsForm();
  }

  activeLocalizedDetailsForm(): AdminEntityPreviewLocalizedDetailsForm {
    if (this.activeTranslationLocale === 'es') {
      return this.detailsForm as AdminEntityPreviewLocalizedDetailsForm;
    }

    return this.localizedDetailForms[this.activeTranslationLocale];
  }

  private applyTranslations(entity: AdminEntityResponse): void {
    this.translationForms = applyContentTranslations(entity);
  }

  private applyLocalizedDetailTranslations(entity: AdminEntityResponse): void {
    this.localizedDetailForms = {
      es: this.extractLocalizedDetailsForm(entity, 'es'),
      en: this.extractLocalizedDetailsForm(entity, 'en'),
    };
  }

  private extractLocalizedDetailsForm(
    entity: AdminEntityResponse,
    locale: AdminLocale,
  ): AdminEntityPreviewLocalizedDetailsForm {
    return extractLocalizedDetailsForm(entity, locale);
  }

  private buildLocalizedDetailsPayload(locale: AdminLocale): AdminEntityDetailsPayload | undefined {
    const form =
      locale === 'es'
        ? (this.detailsForm as AdminEntityPreviewLocalizedDetailsForm)
        : this.localizedDetailForms[locale];
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

    return Object.values(payload).some(
      (value) => value !== undefined && value !== null && String(value).trim() !== '',
    )
      ? payload
      : undefined;
  }

  private buildTranslationPayload(locale: AdminLocale): AdminEntityTranslationPayload {
    return buildTranslationPayload(
      locale,
      this.translationForms,
      this.detailsForm,
      this.localizedDetailForms,
      (value) => this.toNullableNumber(value),
    );
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
        this.initialEntityHydrated = true;
        this.schedulePreviewRefresh();
        this.loadRelations();
        this.loadIncomingRelations();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadError = err?.error?.message ?? 'No se pudo cargar la entity';
        this.loading = false;
        this.initialEntityHydrated = true;
        this.cdr.markForCheck();
      },
    });
  }

  private applyEntityResponse(
    entity: AdminEntityResponse,
    preserveDirtyMediaEditors = true,
    clearedEditorId?: string,
  ) {
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
      ? entity.sourceRefs.map((ref) => normalizeSourceRef(ref))
      : [];
    this.contributors = Array.isArray(entity.contributors)
      ? entity.contributors.map((contributor) => normalizeContributor(contributor))
      : [];
    this.entityTags = Array.isArray(entity.tags) ? entity.tags : [];
    this.entityAliases = Array.isArray(entity.aliases) ? entity.aliases : [];
    this.syncPreviewEntityModel(true);
    this.schedulePreviewRefresh();
  }

  private loadRelationTypes() {
    this.relationTypesLoading = true;
    this.relationTypesApi.list().subscribe({
      next: (types) => {
        this.relationTypes = types;
        this.newRelation = createEmptyRelationDraft(types);
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

    if (payload.status === 'PUBLISHED' && this.shouldWarnBeforePublish()) {
      const proceed = window.confirm(
        'Esta entity se va a publicar con señales de discoverability incompletas. Puedes continuar, pero el search abstracto será más débil. ¿Quieres publicarla igualmente?',
      );

      if (!proceed) {
        return;
      }
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
            void this.router.navigate(['/admin/entities', entity.id, 'edit'], {
              queryParams: { returnTo: this.adminReturnTo },
            });
          }
          return;
        }

        setTimeout(() => {
          void this.router.navigateByUrl(this.adminReturnTarget());
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
    void this.router.navigateByUrl(this.adminReturnTarget());
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

    if (!shouldSearchRelationTargets(q)) {
      this.relationResults = [];
      this.cdr.markForCheck();
      return;
    }

    this.relationLoading = true;

    this.adminApi
      .list({
        q,
        limit: 12,
        page: 1,
        sort: 'title',
      })
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res?.items) ? res.items : [];
          this.relationResults = filterRelationSearchResults(items, this.entityId);
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

  selectRelationTarget(entity: AdminEntitySearchListItem) {
    this.newRelation.toId = entity.id;
    this.relationSearch = buildSelectedRelationSearchLabel(entity);
    this.relationResults = [];
    this.cdr.markForCheck();
  }

  onRelationTypeChange(relationTypeId: string) {
    this.newRelation = resolveRelationTypeSelection(
      this.relationTypes,
      relationTypeId,
      this.newRelation,
    );
  }

  addRelation() {
    if (!canSubmitRelationDraft(this.entityId, this.newRelation)) {
      return;
    }

    const payload: AdminCreateRelationPayload = buildCreateRelationPayload(this.newRelation);

    this.adminApi.createRelation(this.entityId, payload).subscribe({
      next: () => {
        this.newRelation = createEmptyRelationDraft(this.relationTypes);
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

    this.tagsApi
      .create({
        label,
        category: this.newTagCategory.trim() || undefined,
      })
      .subscribe({
        next: (tag) => {
          this.availableTags = [...this.availableTags, tag].sort((a, b) =>
            a.label.localeCompare(b.label),
          );
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
              this.tagsError =
                err?.error?.message ?? 'Tag creado, pero no se pudo añadir a la entity.';
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
        this.entityTags = this.entityTags.filter(
          (entityTag) => entityTag.tagId !== tagId && entityTag.tag?.id !== tagId,
        );
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
    return this.entityTags.some(
      (entityTag) => entityTag.tagId === tagId || entityTag.tag?.id === tagId,
    );
  }

  aliasLocaleLabel(locale?: string | null): string {
    if (!locale || locale === 'und') {
      return 'Global';
    }

    if (locale === 'es') {
      return 'ES';
    }

    if (locale === 'en') {
      return 'EN';
    }

    return locale.toUpperCase();
  }

  aliasKindLabel(kind?: string | null): string {
    return this.aliasKinds.find((entry) => entry.value === kind)?.label ?? kind ?? 'Alias';
  }

  addAlias() {
    const value = this.newAliasValue.trim();
    if (!this.entityId || !value || this.aliasesSaving) return;

    this.aliasesSaving = true;
    this.aliasesMessage = '';
    this.aliasesError = '';

    this.adminApi
      .createAlias(this.entityId, {
        value,
        locale: this.newAliasLocale,
        kind: this.newAliasKind,
      })
      .subscribe({
        next: (entity) => {
          this.aliasesSaving = false;
          this.entityAliases = Array.isArray(entity.aliases) ? entity.aliases : [];
          this.newAliasValue = '';
          this.newAliasLocale = 'und';
          this.newAliasKind = 'COMMON_NAME';
          this.aliasesMessage = 'Alias anadido.';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.aliasesSaving = false;
          this.aliasesError = err?.error?.message ?? 'No se pudo anadir el alias.';
          this.cdr.markForCheck();
        },
      });
  }

  removeAlias(aliasId: string) {
    if (!this.entityId || this.aliasesSaving) return;

    this.aliasesSaving = true;
    this.aliasesMessage = '';
    this.aliasesError = '';

    this.adminApi.deleteAlias(this.entityId, aliasId).subscribe({
      next: (entity) => {
        this.aliasesSaving = false;
        this.entityAliases = Array.isArray(entity.aliases) ? entity.aliases : [];
        this.aliasesMessage = 'Alias eliminado.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.aliasesSaving = false;
        this.aliasesError = err?.error?.message ?? 'No se pudo eliminar el alias.';
        this.cdr.markForCheck();
      },
    });
  }

  availableTagsToAttach(): Tag[] {
    return this.availableTags.filter((tag) => tag.isActive && !this.tagAlreadySelected(tag.id));
  }

  saveRelation(rel: AdminEntityRelationRecord) {
    if (!this.entityId) return;

    this.adminApi.updateRelation(this.entityId, rel.id, buildUpdateRelationPayload(rel)).subscribe({
      next: (updated) => {
        this.relations = this.relations.map((item) => (item.id === updated.id ? updated : item));
        this.incomingRelations = this.incomingRelations.map((item) =>
          item.id === updated.id ? updated : item,
        );
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
    this.incomingRelations = this.incomingRelations.filter(
      (relation) => relation.id !== relationId,
    );
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

    const result = buildSourceRefPayload(this.newSourceRef, (value) =>
      this.toNullableNumber(value),
    );
    if (!result.payload) {
      this.sourcesError = result.error ?? 'No se pudo preparar la fuente.';
      this.cdr.markForCheck();
      return;
    }

    this.sourcesError = '';
    this.sourcesMessage = '';
    this.sourcesSaving = true;

    this.adminApi.createSourceRef(this.entityId, result.payload).subscribe({
      next: (ref) => {
        this.sourcesSaving = false;
        this.sourceRefs = [...this.sourceRefs, normalizeSourceRef(ref)];
        this.newSourceRef = createEmptySourceRefDraft();
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

  saveSourceRef(ref: AdminEditableSourceRef) {
    if (!this.entityId || this.sourcesSaving) {
      return;
    }

    const result = buildSourceRefPayload(ref, (value) => this.toNullableNumber(value));
    if (!result.payload) {
      this.sourcesError = result.error ?? 'No se pudo preparar la fuente.';
      this.cdr.markForCheck();
      return;
    }

    this.sourcesError = '';
    this.sourcesMessage = '';
    this.sourcesSaving = true;

    this.adminApi.updateSourceRef(this.entityId, ref.id, result.payload).subscribe({
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

    const result = buildContributorPayload(this.newContributor);
    if (!result.payload) {
      this.contributorsError = result.error ?? 'No se pudo preparar el colaborador.';
      this.cdr.markForCheck();
      return;
    }

    this.contributorsError = '';
    this.contributorsMessage = '';
    this.contributorsSaving = true;

    this.adminApi.createContributor(this.entityId, result.payload).subscribe({
      next: (contributor) => {
        this.contributorsSaving = false;
        this.contributors = [...this.contributors, normalizeContributor(contributor)];
        this.newContributor = createEmptyContributorDraft();
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

  saveContributor(contributor: AdminEditableContributor) {
    if (!this.entityId || this.contributorsSaving) {
      return;
    }

    const result = buildContributorPayload(contributor);
    if (!result.payload) {
      this.contributorsError = result.error ?? 'No se pudo preparar el colaborador.';
      this.cdr.markForCheck();
      return;
    }

    this.contributorsError = '';
    this.contributorsMessage = '';
    this.contributorsSaving = true;

    this.adminApi.updateContributor(this.entityId, contributor.id, result.payload).subscribe({
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
    return contentFieldLabelFromPresenter(this.form.type);
  }

  contentFieldHint(): string {
    return contentFieldHintFromPresenter(this.form.type);
  }

  summaryFieldHint(): string {
    return summaryFieldHintFromPresenter(this.form.type);
  }

  typedDetailsSummary(): string {
    return typedDetailsSummaryFromPresenter(this.form.type, this.detailsForm);
  }

  previewKeyConnections(): AdminEntityPreviewConnection[] {
    return buildAdminPreviewKeyConnections(this.relations, this.incomingRelations);
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
    return this.mediaLibraryModel.mainVisualSlots;
  }

  get coverageSummaryCards(): Array<{
    label: string;
    value: string;
    tone?: 'warning' | 'ok' | 'neutral';
  }> {
    return this.mediaLibraryModel.coverageSummaryCards;
  }

  get mainUsedEditors(): EditableAdminMediaEditor[] {
    return this.mediaLibraryModel.mainUsedEditors;
  }

  get additionalMediaEditors(): EditableAdminMediaEditor[] {
    return this.mediaLibraryModel.additionalMediaEditors;
  }

  get derivedEditors(): EditableAdminMediaEditor[] {
    return this.mediaLibraryModel.derivedEditors;
  }

  get unusedEditors(): EditableAdminMediaEditor[] {
    return this.mediaLibraryModel.unusedEditors;
  }

  get libraryManagedCount(): number {
    return this.mediaLibraryModel.libraryManagedCount;
  }

  canIngestMedia(link: EditableAdminMediaLink): boolean {
    return this.editorPresentation(link).canIngest;
  }

  sourceExternalLink(link: EditableAdminMediaLink): EditableAdminMediaLink | null {
    return this.mediaLibraryModel.sourceExternalLinkById[link.id] ?? null;
  }

  canPromoteIngestedMedia(link: EditableAdminMediaLink): boolean {
    return this.editorPresentation(link).canPromote;
  }

  canRestoreExternalMedia(link: EditableAdminMediaLink): boolean {
    return this.editorPresentation(link).canRestore;
  }

  ingestedSourceLabel(link: EditableAdminMediaLink): string | null {
    return this.editorPresentation(link).ingestedSourceLabel;
  }

  replacementTargetLabel(link: EditableAdminMediaLink): string | null {
    return this.editorPresentation(link).replacementTargetLabel;
  }

  replacementIngestedLabel(link: EditableAdminMediaLink): string | null {
    return this.editorPresentation(link).replacementIngestedLabel;
  }

  hasPromotedVisualReplacement(link: EditableAdminMediaLink): boolean {
    return this.editorPresentation(link).hasPromotedReplacement;
  }

  replacementIngestedLink(link: EditableAdminMediaLink): EditableAdminMediaLink | null {
    return this.mediaLibraryModel.replacementIngestedLinkById[link.id] ?? null;
  }

  get mediaWarnings(): string[] {
    return this.mediaLibraryModel.mediaWarnings;
  }

  get activeMediaEditor(): EditableAdminMediaEditor | null {
    return this.mediaLibraryModel.activeMediaEditor;
  }

  mediaLibraryViewCount(viewId: MediaLibraryViewId): string {
    return this.mediaLibraryModel.viewCounts[viewId];
  }

  mediaLibraryViewClass(viewId: MediaLibraryViewId): string {
    return `admin-dashboard-nav__item media-library-nav__item${this.activeMediaLibraryView === viewId ? ' is-active' : ''}`;
  }

  setMediaLibraryView(viewId: MediaLibraryViewId) {
    this.activeMediaLibraryView = viewId;
    this.syncMediaLibraryModel();
    this.cdr.markForCheck();
  }

  slotResolutionLabel(slot: VisualSlot): string {
    return mediaSlotResolutionLabel(slot);
  }

  slotStateClass(slot: VisualSlot): string {
    return mediaSlotStateClass(slot);
  }

  addExternalMedia(event: MediaAddExternalSubmit) {
    if (!this.entityId || this.addingMedia) {
      return;
    }

    this.mediaError = '';
    this.mediaMessage = '';

    const result = buildAdminMediaPayload(event.draft, (value) => this.toNullableNumber(value));
    if ('error' in result) {
      this.mediaError = result.error;
      this.cdr.markForCheck();
      return;
    }

    this.addingMedia = true;

    this.adminApi.createMedia(this.entityId, result.payload).subscribe({
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

    const payload = buildAdminUploadPayload(event.draft, event.dimensions, (value) =>
      this.toNullableNumber(value),
    );
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

    const result = buildAdminMediaUpdatePayload(editor.draft, (value) =>
      this.toNullableNumber(value),
    );
    if ('error' in result) {
      this.mediaError = result.error;
      this.cdr.markForCheck();
      return;
    }

    editor.saveState = 'saving';
    editor.errorMessage = '';

    this.adminApi.updateMedia(this.entityId, link.id, result.payload).subscribe({
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
    const previousMediaState = cloneMediaLibraryState(this.currentMediaLibraryState(), (value) =>
      this.toNullableNumber(value),
    );
    this.applyMediaLibraryStateSnapshot(removeMediaFromLibraryState(previousMediaState, link.id));
    this.syncPreviewEntityModel(true);
    this.cdr.markForCheck();

    this.adminApi.deleteMedia(this.entityId, link.id).subscribe({
      next: () => {
        this.mediaMessage = 'Asociación de media eliminada.';
        this.refreshMediaLibrary(true, editor.id);
      },
      error: (err) => {
        this.applyMediaLibraryStateSnapshot(previousMediaState);
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
        this.mediaMessage =
          'El asset INGESTED ocupa ahora el papel visual del externo. El asset externo sigue visible como Additional Media.';
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
    const ingestedRoleLabel = ingested
      ? this.mediaRoleLabel(ingested.role)
      : 'el asset ingerido promovido';

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
        this.mediaMessage =
          'El asset externo recupera ahora el papel visual principal. El INGESTED sigue visible como Additional Media.';
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
    return mediaSlotStatusLabel(slot, (role) => this.mediaRoleLabel(role));
  }

  private syncPreviewEntityModel(force = false): void {
    const nextStateKey = buildAdminEntityPreviewStateKey(this.previewPresenterInput());
    if (!force && nextStateKey === this.previewEntityStateKey) {
      return;
    }

    this.previewEntityStateKey = nextStateKey;
    this.previewEntityModel = buildAdminEntityPreviewModel(this.previewPresenterInput());
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

  private previewPresenterInput(): AdminEntityPreviewBuildInput {
    return {
      entityId: this.entityId,
      locale: this.i18n.locale(),
      form: this.form,
      translations: this.translationForms,
      details: this.detailsForm,
      localizedDetails: this.localizedDetailForms,
      entityTags: this.entityTags,
      relations: this.relations,
      incomingRelations: this.incomingRelations,
      sourceRefs: this.sourceRefs,
      contributors: this.contributors,
      mediaEditors: this.mediaEditors,
      persistedResolvedMedia: this.persistedResolvedMedia,
      resolvedVisualSlots: this.resolvedVisualSlots,
      toNullableNumber: (value) => this.toNullableNumber(value),
    };
  }

  hasOtherPersistedLegacy(linkId: string): boolean {
    return this.persistedMediaLinks.some((link) => link.isPrimary && link.id !== linkId);
  }

  isActiveSection(sectionId: DashboardSectionId): boolean {
    return this.activeDashboardSection === sectionId;
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

    const saved = window.localStorage.getItem(
      this.dashboardSectionStorageKey(),
    ) as DashboardSectionId | null;
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

    window.localStorage.setItem(
      this.previewVisibilityStorageKey(),
      this.previewVisible ? 'visible' : 'hidden',
    );
  }

  private persistAdminSidebarVisibility() {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      this.adminSidebarStorageKey(),
      this.adminSidebarVisible ? 'visible' : 'hidden',
    );
  }

  private extractDetailsForm(entity: AdminEntityResponse): AdminEntityDetailsPayload {
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

  private upsertSourceRef(ref: AdminEntitySourceRefRecord) {
    this.sourceRefs = upsertSourceRef(this.sourceRefs, normalizeSourceRef(ref));
  }

  private upsertContributor(contributor: AdminEntityContributorRecord) {
    this.contributors = upsertContributor(this.contributors, normalizeContributor(contributor));
  }

  private upsertEntityTag(entityTag: AdminEntityTagRecord) {
    const tagId = entityTag.tagId ?? entityTag.tag?.id;
    if (!tagId) return;

    const existingIndex = this.entityTags.findIndex(
      (item) => (item.tagId ?? item.tag?.id) === tagId,
    );
    if (existingIndex >= 0) {
      const next = [...this.entityTags];
      next[existingIndex] = entityTag;
      this.entityTags = next;
      return;
    }

    this.entityTags = [...this.entityTags, entityTag];
  }

  entityTagId(entityTag: AdminEntityTagRecord): string | null {
    return entityTag.tagId ?? entityTag.tag?.id ?? null;
  }

  private compactJoin(values: Array<string | number | null | undefined>): string {
    return values
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .join(' · ');
  }

  private applyMediaLibraryState(
    entity: AdminEntityResponse,
    preserveDirtyEditors = true,
    clearedEditorId?: string,
  ) {
    this.applyMediaLibraryStateSnapshot(
      buildAdminEntityMediaLibraryState({
        entity,
        mediaEditors: this.mediaEditors,
        activeMediaEditorId: this.activeMediaEditorId,
        activeMediaLibraryView: this.activeMediaLibraryView,
        preserveDirtyEditors,
        clearedEditorId,
        toNullableNumber: (value) => this.toNullableNumber(value),
      }),
    );
  }

  slotWarningsForEditor(
    link: EditableAdminMediaLink,
  ): Partial<Record<MediaEditorSlotKey, string[]>> {
    return this.editorPresentation(link).slotWarnings;
  }

  selectMediaEditor(linkOrId: EditableAdminMediaLink | string | null | undefined) {
    this.activeMediaEditorId = typeof linkOrId === 'string' ? linkOrId : (linkOrId?.id ?? null);
    this.syncMediaLibraryModel();
    this.cdr.markForCheck();
  }

  private cloneMediaLink(link: EditableAdminMediaLink): EditableAdminMediaLink {
    return cloneAdminMediaLink(link, (value: unknown) => this.toNullableNumber(value));
  }

  private editorForLink(link: EditableAdminMediaLink): EditableAdminMediaEditor | null {
    return this.mediaEditors.find((editor) => editor.id === link.id) ?? null;
  }

  private markEditorDirty(editor: EditableAdminMediaEditor) {
    editor.isDirty = !mediaLinksEqual(editor.persisted, editor.draft);
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

  private toNullableNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  activeSlotLabels(link: EditableAdminMediaLink): string[] {
    return this.editorPresentation(link).activeSlotLabels;
  }

  readonly mediaEditorPresentationFor = (link: EditableAdminMediaLink) =>
    this.editorPresentation(link);
  readonly hasAnyPersistedLegacyForEditor = (editorId: string) =>
    this.hasOtherPersistedLegacy(editorId);

  get sidebarSections(): AdminEntitySidebarSectionItem[] {
    return buildAdminEntitySidebarSections({
      activeDashboardSection: this.activeDashboardSection,
      supportsTypedDetails: this.supportsTypedDetails(),
      isEdit: this.isEdit,
      persistedMediaLinksCount: this.persistedMediaLinks.length,
      sourceRefsCount: this.sourceRefs.length,
      contributorsCount: this.contributors.length,
      relationsCount: this.relations.length,
      incomingRelationsCount: this.incomingRelations.length,
      contentHasError: !!(this.errorMessage || this.detailsError),
      contentSaving: !!(this.saving || this.detailsSaving),
      mediaHasError: !!this.mediaError,
      mediaSaving: !!(
        this.addingMedia ||
        this.uploadingMedia ||
        this.mediaEditors.some((editor) => editor.saveState === 'saving')
      ),
      sourcesHasError: !!this.sourcesError,
      sourcesSaving: !!this.sourcesSaving,
      contributorsHasError: !!this.contributorsError,
      contributorsSaving: !!this.contributorsSaving,
      relationsHasError: !!this.errorMessage,
      relationsSaving: !!(this.relationsLoading || this.incomingRelationsLoading),
    });
  }

  get entitySaveStatus(): AdminEntitySaveStatusViewModel {
    return buildAdminEntitySaveStatusViewModel({
      saving: this.saving,
      entitySaveState: this.entitySaveState,
      entityLastSavedAt: this.entityLastSavedAt,
      isEdit: this.isEdit,
    });
  }

  get discoverabilityItems(): AdminEntityDiscoverabilityItem[] {
    const aliasesCount = this.entityAliases.length;
    const tagsCount = this.entityTags.length;
    const translationCoverage = this.translationLocales.every(
      (entry) => this.translationStatus(entry.locale) !== 'missing',
    );
    const structuredFieldCount = this.structuredSearchSignalCount();
    const contextCount =
      this.relations.length + this.incomingRelations.length + this.sourceRefs.length;

    return [
      {
        label: 'Lenguaje base',
        detail:
          this.form.summary?.trim() || this.form.content?.trim()
            ? 'La entity tiene resumen o contenido explicativo.'
            : 'Añade al menos resumen o contenido para describirla mejor.',
        done: !!(this.form.summary?.trim() || this.form.content?.trim()),
      },
      {
        label: 'Aliases de búsqueda',
        detail: aliasesCount
          ? `${aliasesCount} alias registrados para memoria incompleta o nombres alternativos.`
          : 'Añade 2-6 aliases útiles: nombre común, error frecuente o pista de búsqueda.',
        done: aliasesCount > 0,
      },
      {
        label: 'Taxonomía',
        detail: tagsCount
          ? `${tagsCount} tags conectan esta entity con rutas de descubrimiento.`
          : 'Añade 1-3 tags para materiales, temas, cultura o tipo de objeto.',
        done: tagsCount > 0,
      },
      {
        label: 'Detalles estructurados',
        detail: structuredFieldCount
          ? `${structuredFieldCount} señales estructuradas alimentan el search.`
          : 'Completa materiales, técnica, definición, disciplinas o ubicación según el tipo.',
        done: structuredFieldCount > 0,
      },
      {
        label: 'Contexto editorial',
        detail: contextCount
          ? `${contextCount} conexiones entre relaciones y fuentes refuerzan el contexto.`
          : 'Añade al menos una relación o una fuente para reforzar el contexto.',
        done: contextCount > 0,
      },
      {
        label: 'Cobertura bilingüe',
        detail: translationCoverage
          ? 'Las traducciones principales ya están presentes.'
          : 'Completa ES y EN para mejorar recall y presentación multilenguaje.',
        done: translationCoverage,
      },
    ];
  }

  get discoverabilityCompletedCount(): number {
    return this.discoverabilityItems.filter((item) => item.done).length;
  }

  get discoverabilityScoreLabel(): string {
    return `${this.discoverabilityCompletedCount}/${this.discoverabilityItems.length} listo`;
  }

  get discoverabilityTone(): 'strong' | 'partial' | 'weak' {
    const ratio = this.discoverabilityCompletedCount / this.discoverabilityItems.length;
    if (ratio >= 0.84) return 'strong';
    if (ratio >= 0.5) return 'partial';
    return 'weak';
  }

  get discoverabilitySummary(): string {
    switch (this.discoverabilityTone) {
      case 'strong':
        return 'La entity ya tiene buenas señales para search literal, conceptual y discovery editorial.';
      case 'partial':
        return 'La base está bien, pero aún faltan algunas señales para búsquedas abstractas y recuperación borrosa.';
      default:
        return 'La entity todavía depende demasiado del título exacto. Conviene enriquecerla antes de confiar en el search abstracto.';
    }
  }

  get publishDiscoverabilityWarning(): string | null {
    if (this.form.status !== 'PUBLISHED') {
      return null;
    }

    if (!this.shouldWarnBeforePublish()) {
      return null;
    }

    return 'Publicada así seguirá visible, pero su rendimiento en búsquedas vagas o recordadas a medias será limitado.';
  }

  private shouldWarnBeforePublish(): boolean {
    return this.discoverabilityCompletedCount < 4;
  }

  private structuredSearchSignalCount(): number {
    const values = Object.values(this.detailsForm ?? {});
    return values.filter((value) => {
      if (typeof value === 'number') {
        return Number.isFinite(value);
      }

      return typeof value === 'string' && value.trim().length > 0;
    }).length;
  }

  private editorPresentation(link: EditableAdminMediaLink) {
    return (
      this.mediaLibraryModel.editorMetaById[link.id] ?? {
        activeSlotLabels: [],
        canIngest: false,
        canPromote: false,
        canRestore: false,
        hasPromotedReplacement: false,
        replacementTargetLabel: null,
        replacementIngestedLabel: null,
        ingestedSourceLabel: null,
        slotWarnings: {},
      }
    );
  }

  private buildMediaLibraryModel(): AdminEntityMediaLibraryViewModel {
    return buildAdminEntityMediaLibraryViewModel({
      mediaEditors: this.mediaEditors,
      persistedMediaLinks: this.persistedMediaLinks,
      resolvedVisualSlots: this.resolvedVisualSlots,
      additionalMediaItems: this.additionalMediaItems,
      mediaWarningsDetailed: this.mediaWarningsDetailed,
      mediaWarningMessages: this.mediaWarningMessages,
      mediaCoverageSummary: this.mediaCoverageSummary,
      activeMediaEditorId: this.activeMediaEditorId,
      mediaRoleLabel: (role) => this.mediaRoleLabel(role),
    });
  }

  private syncMediaLibraryModel() {
    this.mediaLibraryModel = this.buildMediaLibraryModel();
  }

  private currentMediaLibraryState(): AdminEntityMediaLibraryState {
    return {
      persistedMediaLinks: this.persistedMediaLinks,
      mediaEditors: this.mediaEditors,
      resolvedVisualSlots: this.resolvedVisualSlots,
      additionalMediaItems: this.additionalMediaItems,
      mediaWarningsDetailed: this.mediaWarningsDetailed,
      mediaWarningMessages: this.mediaWarningMessages,
      mediaCoverageSummary: this.mediaCoverageSummary,
      activeMediaEditorId: this.activeMediaEditorId,
      activeMediaLibraryView: this.activeMediaLibraryView,
    };
  }

  private applyMediaLibraryStateSnapshot(state: AdminEntityMediaLibraryState) {
    this.persistedMediaLinks = state.persistedMediaLinks;
    this.mediaEditors = state.mediaEditors;
    this.resolvedVisualSlots = state.resolvedVisualSlots;
    this.additionalMediaItems = state.additionalMediaItems;
    this.mediaWarningsDetailed = state.mediaWarningsDetailed;
    this.mediaWarningMessages = state.mediaWarningMessages;
    this.mediaCoverageSummary = state.mediaCoverageSummary;
    this.activeMediaEditorId = state.activeMediaEditorId;
    this.activeMediaLibraryView = state.activeMediaLibraryView;
    this.syncMediaLibraryModel();
  }

  onContentInput() {
    const value = this.form.content ?? '';
    const textarea = this.contentTextarea?.nativeElement;

    if (!textarea) {
      this.closeLinkSuggestions();
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const linkMatch = detectAdminEntityLinkMatch(value, cursor);
    if (!linkMatch) {
      this.closeLinkSuggestions();
      return;
    }

    this.linkStartIndex = linkMatch.startIndex;
    this.linkSearch = linkMatch.query;
    this.showLinkSuggestions = true;

    if (linkMatch.query.length < 1) {
      this.linkSuggestions = [];
      this.linkLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.linkSearch$.next(linkMatch.query);
  }

  insertEntityLink(entity: AdminEntitySearchListItem) {
    const textarea = this.contentTextarea?.nativeElement;
    const value = this.form.content ?? '';

    if (!textarea || this.linkStartIndex < 0) {
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const inserted = insertAdminEntityLink(value, this.linkStartIndex, cursor, entity);
    this.form.content = inserted.value;
    this.closeLinkSuggestions();
    this.cdr.markForCheck();

    queueMicrotask(() => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(inserted.cursor, inserted.cursor);
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
