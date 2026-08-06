import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  AdminAdditionalMediaItem,
  AdminEntityAliasRecord,
  AdminEntityClassificationRecord,
  AdminEntityResponse,
  AdminEntityRelationRecord,
  AdminEntityTagRecord,
  AdminEntityDetailsPayload,
  AdminMediaCoverageSummary,
  AdminEntityPayload,
  AdminLocale,
  AdminMediaWarning,
} from '../../../core/api/admin-entities.api';
import { I18nService } from '../../../core/i18n/i18n.service';
import { getEntityTypeConfig } from '../../graph/graph.config';
import { AdminEntitySidebarComponent } from './admin-entity-sidebar.component';
import { buildAdminEntityDiscoverabilityModel } from './admin-entity-discoverability.presenter';
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
  AdminEntityPreviewLocalizedDetailsForm,
  AdminEntityPreviewTranslationForm,
  buildAdminEntityPreviewStateKey,
} from './admin-entity-preview.presenter';
import {
  AdminEntityFormDraft,
  applyTranslations as applyContentTranslations,
  buildEntityPayload,
  canAutosaveEntity,
  createEmptyLocalizedDetailsForm,
  createEmptyTranslationForm,
  extractEntityDetails,
  extractLocalizedDetailsForm,
  translationStatus as translationStatusFromPresenter,
  typedDetailsSummary as typedDetailsSummaryFromPresenter,
} from './admin-entity-content.presenter';
import {
  AdminEditableContributor,
  AdminEditableSourceRef,
  normalizeContributor,
  normalizeSourceRef,
} from './admin-entity-metadata.presenter';
import { MediaLibraryViewId, VisualSlot } from './admin-entity-media.presenter';
import {
  AdminEntityMediaLibraryState,
  buildAdminEntityMediaLibraryState,
} from './admin-entity-media.helpers';
import { EditableAdminMediaEditor, EditableAdminMediaLink } from './media-admin.models';
import { AdminEntityFormFacade } from './admin-entity-form.facade';
import {
  AdminEntityRelationsEditorComponent,
  AdminEntityRelationsState,
} from './admin-entity-relations-editor.component';
import {
  AdminEntitySourcesEditorComponent,
  AdminEntitySourcesState,
} from './admin-entity-sources-editor.component';
import {
  AdminEntityContributorsEditorComponent,
  AdminEntityContributorsState,
} from './admin-entity-contributors-editor.component';
import { AdminEntityPreviewComponent } from './admin-entity-preview.component';
import { AdminEntityMediaLibraryComponent } from './admin-entity-media-library.component';
import { AdminEntityMediaActionsSnapshot } from './admin-entity-media.actions';
import {
  AdminEntityGlobalDataComponent,
  AdminEntityGlobalDataDraft,
} from './admin-entity-global-data.component';
import { AdminEntityRouteShell } from './admin-entity-route-shell';

const DRAFT_TYPES: Array<{
  type: AdminEntityPayload['type'];
  label: string;
  description: string;
}> = [
  {
    type: 'ARTWORK',
    label: 'Obra',
    description: 'Una obra y su contexto material, histórico y visual.',
  },
  {
    type: 'ARTIST',
    label: 'Artista',
    description: 'Una trayectoria, práctica y red de influencias.',
  },
  {
    type: 'ARTICLE',
    label: 'Artículo',
    description: 'Una pieza editorial que interpreta y conecta conocimiento.',
  },
  {
    type: 'CONCEPT',
    label: 'Concepto',
    description: 'Una idea crítica presente en obras, épocas y discursos.',
  },
  {
    type: 'MOVEMENT',
    label: 'Movimiento',
    description: 'Una corriente artística y las conexiones que la definen.',
  },
  {
    type: 'PERIOD',
    label: 'Periodo',
    description: 'Un marco temporal para organizar la biblioteca.',
  },
  { type: 'PLACE', label: 'Lugar', description: 'Un lugar cultural, geográfico o institucional.' },
  { type: 'TEXT', label: 'Texto', description: 'Un documento, manifiesto o referencia escrita.' },
  {
    type: 'EVENT',
    label: 'Evento',
    description: 'Un acontecimiento que sitúa y conecta la cultura.',
  },
  {
    type: 'ORGANIZATION',
    label: 'Organización',
    description: 'Una institución, colectivo o agente cultural.',
  },
];

@Component({
  standalone: true,
  selector: 'app-admin-entity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminEntitySidebarComponent,
    AdminEntityGlobalDataComponent,
    AdminEntityRelationsEditorComponent,
    AdminEntitySourcesEditorComponent,
    AdminEntityContributorsEditorComponent,
    AdminEntityPreviewComponent,
    AdminEntityMediaLibraryComponent,
  ],
  templateUrl: './admin-entity-form.component.html',
  styleUrls: ['./admin-entity-form.component.scss'],
  providers: [AdminEntityFormFacade, AdminEntityRouteShell],
})
export class AdminEntityFormComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly AUTOSAVE_DELAY_MS = 1200;
  readonly i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  readonly facade = inject(AdminEntityFormFacade);
  readonly shell = inject(AdminEntityRouteShell);

  readonly draftTypes = DRAFT_TYPES.map((option) => ({
    ...getEntityTypeConfig(option.type),
    ...option,
  }));

  activeMediaLibraryView: MediaLibraryViewId = 'coverage';

  readonly translationLocales: Array<{ locale: AdminLocale; label: string }> = [
    { locale: 'es', label: 'Español' },
    { locale: 'en', label: 'English' },
  ];
  translationForms: Record<AdminLocale, AdminEntityPreviewTranslationForm> = {
    es: createEmptyTranslationForm(),
    en: createEmptyTranslationForm(),
  };
  localizedDetailForms: Record<AdminLocale, AdminEntityPreviewLocalizedDetailsForm> = {
    es: createEmptyLocalizedDetailsForm(),
    en: createEmptyLocalizedDetailsForm(),
  };

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

  incomingRelations: AdminEntityRelationRecord[] = [];

  entityTags: AdminEntityTagRecord[] = [];
  entityClassifications: AdminEntityClassificationRecord[] = [];
  entityAliases: AdminEntityAliasRecord[] = [];

  relations: AdminEntityRelationRecord[] = [];
  relationsLoading = false;
  relationsError = false;

  detailsSaving = false;
  detailsError = '';
  detailsForm: AdminEntityDetailsPayload = {};

  sourceRefs: AdminEditableSourceRef[] = [];
  sourcesSaving = false;
  sourcesError = '';

  contributors: AdminEditableContributor[] = [];
  contributorsSaving = false;
  contributorsError = '';

  initialEntityHydrated = false;
  private sectionObserver: IntersectionObserver | null = null;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAutosavedPayload = '';

  form: AdminEntityFormDraft = {
    type: 'ARTWORK',
    kind: 'WORK',
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
    this.shell.initialize();

    if (!this.shell.isEdit || !this.shell.entityId) {
      this.initialEntityHydrated = true;
      return;
    }

    this.loadEntity();
  }

  ngAfterViewInit(): void {
    if (!this.shell.isEdit || typeof window === 'undefined') return;

    const sections = ADMIN_ENTITY_DASHBOARD_SECTIONS.map(({ id }) =>
      document.getElementById(id),
    ).filter((section): section is HTMLElement => section !== null);
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
        const sectionId = visibleSection?.target.id as DashboardSectionId | undefined;

        if (sectionId && sectionId !== this.shell.activeSection) {
          this.shell.selectSection(sectionId);
          this.cdr.markForCheck();
        }
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: 0 },
    );
    sections.forEach((section) => this.sectionObserver?.observe(section));
  }

  ngOnDestroy(): void {
    this.sectionObserver?.disconnect();
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
  }

  createDraft(type: AdminEntityPayload['type']): void {
    if (this.facade.creatingDraft()) return;

    this.facade.createDraft(type).subscribe({
      next: (entity) => this.shell.navigateToDraft(entity),
      error: () => this.cdr.markForCheck(),
    });
  }

  scrollToSection(sectionId: DashboardSectionId) {
    this.shell.selectSection(sectionId);
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.scrollMarginTop = '96px';
      section.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    }
    this.cdr.markForCheck();
  }

  private buildPayload(): AdminEntityPayload {
    return buildEntityPayload(this.form, this.translationForms);
  }

  private applyTranslations(entity: AdminEntityResponse): void {
    this.translationForms = applyContentTranslations(entity);
  }

  private applyLocalizedDetailTranslations(entity: AdminEntityResponse): void {
    this.localizedDetailForms = {
      es: extractLocalizedDetailsForm(entity, 'es'),
      en: extractLocalizedDetailsForm(entity, 'en'),
    };
  }

  onGlobalDataDraftChange(state: AdminEntityGlobalDataDraft): void {
    this.form = state.form;
    this.translationForms = state.translations;
    this.localizedDetailForms = state.localizedDetails;
    this.detailsForm = state.details;
    this.entityTags = state.tags;
    this.entityClassifications = state.classifications;
    this.entityAliases = state.aliases;
    this.scheduleAutosave();
  }

  onTranslationSaved(entity: AdminEntityResponse): void {
    this.applyEntityResponse(entity);
    this.cdr.markForCheck();
  }

  private loadEntity() {
    if (!this.shell.entityId) {
      return;
    }

    this.facade.loadEntity(this.shell.entityId).subscribe({
      next: (entity) => {
        this.applyEntityResponse(entity, false);
        this.initialEntityHydrated = true;
        this.lastAutosavedPayload = this.serializePayload(this.buildPayload());
        this.cdr.markForCheck();
      },
      error: () => {
        this.initialEntityHydrated = true;
        this.lastAutosavedPayload = this.serializePayload(this.buildPayload());
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
      kind: entity.kind ?? undefined,
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
    this.detailsForm = extractEntityDetails(entity);
    this.applyLocalizedDetailTranslations(entity);
    this.sourceRefs = Array.isArray(entity.sourceRefs)
      ? entity.sourceRefs.map((ref) => normalizeSourceRef(ref))
      : [];
    this.contributors = Array.isArray(entity.contributors)
      ? entity.contributors.map((contributor) => normalizeContributor(contributor))
      : [];
    this.entityTags = Array.isArray(entity.tags) ? entity.tags : [];
    this.entityClassifications = Array.isArray(entity.classifications)
      ? entity.classifications
      : [];
    this.entityAliases = Array.isArray(entity.aliases) ? entity.aliases : [];
  }

  submit() {
    this.savePayload(this.buildPayload());
  }

  publishEntity(): void {
    this.savePayload({ ...this.buildPayload(), status: 'PUBLISHED' });
  }

  private savePayload(payload: AdminEntityPayload) {
    const localDraft = this.serializePayload(this.buildPayload());
    this.facade.errorMessage.set('');
    this.facade.successMessage.set('');

    if (!payload.title || !payload.slug || !payload.type) {
      this.facade.setSaveError('Título, slug y tipo son obligatorios.');
      return;
    }

    if (payload.status === 'PUBLISHED' && this.discoverabilityModel.shouldWarnBeforePublish) {
      const proceed = window.confirm(
        'Esta entity se va a publicar con señales de discoverability incompletas. Puedes continuar, pero el search abstracto será más débil. ¿Quieres publicarla igualmente?',
      );

      if (!proceed) {
        return;
      }
    }

    this.facade.saveEntity(this.shell.isEdit ? this.shell.entityId : null, payload).subscribe({
      next: (entity) => {
        if (
          entity &&
          this.shell.isEdit &&
          this.serializePayload(this.buildPayload()) === localDraft
        ) {
          this.applyEntityResponse(entity);
          this.lastAutosavedPayload = this.serializePayload(this.buildPayload());
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });
  }

  get manualSaveLabel(): string {
    if (this.facade.saving()) return 'Guardando...';
    return this.form.status === 'PUBLISHED' ? 'Guardar cambios' : 'Guardar ahora';
  }

  onRelationsStateChange(state: AdminEntityRelationsState): void {
    this.relations = state.relations;
    this.incomingRelations = state.incomingRelations;
    this.relationsLoading = state.loading;
    this.relationsError = state.hasError;
  }

  onDetailsSaved(entity: AdminEntityResponse): void {
    this.applyLocalizedDetailTranslations(entity);
    this.cdr.markForCheck();
  }

  onDetailsStatusChange(state: { saving: boolean; error: string }): void {
    this.detailsSaving = state.saving;
    this.detailsError = state.error;
  }

  onSourcesStateChange(state: AdminEntitySourcesState): void {
    this.sourceRefs = state.sourceRefs;
    this.sourcesSaving = state.saving;
    this.sourcesError = state.error;
  }

  onContributorsStateChange(state: AdminEntityContributorsState): void {
    this.contributors = state.contributors;
    this.contributorsSaving = state.saving;
    this.contributorsError = state.error;
  }

  supportsTypedDetails(): boolean {
    return ['ARTWORK', 'ARTIST', 'CONCEPT', 'PERIOD'].includes(this.form.type);
  }

  typedDetailsSummary(): string {
    return typedDetailsSummaryFromPresenter(this.form.type, this.detailsForm);
  }

  onMediaLibraryStateChange(snapshot: AdminEntityMediaActionsSnapshot): void {
    this.applyMediaLibraryStateSnapshot(snapshot.state);
    this.persistedResolvedMedia = snapshot.persistedResolvedMedia;
    this.addingMedia = snapshot.adding;
    this.uploadingMedia = snapshot.uploading;
    this.mediaAddResetVersion = snapshot.resetVersion;
    this.mediaMessage = snapshot.message;
    this.mediaError = snapshot.error;
  }

  previewStateKey(): string {
    return buildAdminEntityPreviewStateKey(this.previewPresenterInput());
  }

  private previewPresenterInput(): AdminEntityPreviewBuildInput {
    return {
      entityId: this.shell.entityId,
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

  toggleAdminSidebar() {
    this.shell.toggleSidebar();
    this.cdr.markForCheck();
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

  private toNullableNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  get sidebarSections(): AdminEntitySidebarSectionItem[] {
    return buildAdminEntitySidebarSections({
      activeDashboardSection: this.shell.activeSection,
      supportsTypedDetails: this.supportsTypedDetails(),
      isEdit: this.shell.isEdit,
      persistedMediaLinksCount: this.persistedMediaLinks.length,
      sourceRefsCount: this.sourceRefs.length,
      contributorsCount: this.contributors.length,
      relationsCount: this.relations.length,
      incomingRelationsCount: this.incomingRelations.length,
      contentHasError: !!(this.facade.errorMessage() || this.detailsError),
      contentSaving: !!(this.facade.saving() || this.detailsSaving),
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
      relationsHasError: this.relationsError,
      relationsSaving: this.relationsLoading,
    });
  }

  get entitySaveStatus(): AdminEntitySaveStatusViewModel {
    return buildAdminEntitySaveStatusViewModel({
      saving: this.facade.saving(),
      entitySaveState: this.facade.saveState(),
      entityLastSavedAt: this.facade.lastSavedAt(),
      isEdit: this.shell.isEdit,
      autosaveEnabled: this.autosaveEnabled,
      isPublished: this.form.status === 'PUBLISHED',
    });
  }

  get autosaveEnabled(): boolean {
    return canAutosaveEntity({
      isEdit: this.shell.isEdit,
      hydrated: this.initialEntityHydrated,
      payload: this.buildPayload(),
    });
  }

  private scheduleAutosave(): void {
    if (!this.initialEntityHydrated) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(
      () => this.autosaveDraft(),
      AdminEntityFormComponent.AUTOSAVE_DELAY_MS,
    );
  }

  private autosaveDraft(): void {
    this.autosaveTimer = null;
    const payload = this.buildPayload();
    const serialized = this.serializePayload(payload);
    if (
      !canAutosaveEntity({
        isEdit: this.shell.isEdit,
        hydrated: this.initialEntityHydrated,
        payload,
      }) ||
      serialized === this.lastAutosavedPayload
    ) {
      return;
    }
    if (this.facade.saving()) {
      this.scheduleAutosave();
      return;
    }

    this.facade.saveEntity(this.shell.entityId, payload, false).subscribe({
      next: () => {
        this.lastAutosavedPayload = serialized;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  private serializePayload(payload: AdminEntityPayload): string {
    return JSON.stringify(payload);
  }

  get discoverabilityModel() {
    const structuredFieldCount = Object.values(this.detailsForm ?? {}).filter((value) =>
      typeof value === 'number'
        ? Number.isFinite(value)
        : typeof value === 'string' && value.trim().length > 0,
    ).length;
    return buildAdminEntityDiscoverabilityModel({
      hasLanguageBase: !!(this.form.summary?.trim() || this.form.content?.trim()),
      aliasesCount: this.entityAliases.length,
      tagsCount: this.entityTags.length,
      structuredFieldCount,
      contextCount: this.relations.length + this.incomingRelations.length + this.sourceRefs.length,
      translationCoverage: this.translationLocales.every(
        (entry) =>
          translationStatusFromPresenter(this.translationForms, entry.locale) !== 'missing',
      ),
      published: this.form.status === 'PUBLISHED',
    });
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
  }
}
