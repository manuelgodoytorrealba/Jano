import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { EntityTypeDefinition, EntityTypesApi } from '../../../core/api/entity-types.api';

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
    FormsModule,
    RouterLink,
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

  private readonly entityTypesApi = inject(EntityTypesApi);
  draftTypes: Array<{
    type: string;
    label: string;
    description: string;
    icon: string;
    color: string;
  }> = [];
  entityTypeDefinitions: EntityTypeDefinition[] = [];

  newEntityTitle = '';
  newEntitySlug = '';
  creatingType = false;
  savingType = false;
  typeError = '';
  newType = {
    singularName: '',
    pluralName: '',
    description: '',
    key: '',
    icon: '',
    colorToken: 'slate',
    baseKind: 'WORK',
    status: 'ACTIVE' as const,
  };
  readonly typeKinds = [
    ['PERSON', 'Persona o agente'],
    ['WORK', 'Obra u objeto cultural'],
    ['ABSTRACTION', 'Concepto, técnica o idea'],
    ['PLACE', 'Lugar'],
    ['EVENT', 'Evento'],
    ['ORGANIZATION', 'Organización'],
  ] as const;
  readonly typeColors = [
    ['slate', 'Neutro'],
    ['blue', 'Azul'],
    ['coral', 'Coral'],
    ['orange', 'Naranja'],
    ['green', 'Verde'],
    ['violet', 'Violeta'],
    ['gold', 'Oro'],
    ['teal', 'Turquesa'],
    ['rose', 'Rosa'],
  ] as const;

  activeMediaLibraryView: MediaLibraryViewId = 'library';

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

    this.entityTypesApi.list().subscribe({
      next: (types) => {
        this.entityTypeDefinitions = types;
        this.draftTypes = this.sortTypes(types.filter((type) => type.status === 'ACTIVE')).map(
          (type) => this.draftType(type),
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.typeError = 'No se pudieron cargar los tipos de entidad.';
        this.cdr.markForCheck();
      },
    });

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

    const title = this.newEntityTitle.trim();
    if (!title || !this.newEntitySlug) {
      this.facade.createDraftError.set('Escribe un nombre provisional para abrir el borrador.');
      return;
    }

    this.facade
      .saveEntity(null, { type, title, slug: this.newEntitySlug, status: 'DRAFT' })
      .subscribe({
        next: (entity) => this.shell.navigateToDraft(entity),
        error: () => this.cdr.markForCheck(),
      });
  }

  createType(): void {
    const singularName = this.newType.singularName.trim();
    const key = (this.newType.key || this.slugify(singularName)).replace(/-/g, '_').toUpperCase();
    if (!singularName || !this.newType.pluralName.trim() || !key || this.savingType) return;
    this.savingType = true;
    this.typeError = '';
    this.entityTypesApi
      .create({
        ...this.newType,
        singularName,
        pluralName: this.newType.pluralName.trim(),
        key,
        icon: this.newType.icon.trim() || singularName[0].toUpperCase(),
      })
      .subscribe({
        next: (type) => {
          this.entityTypeDefinitions = [...this.entityTypeDefinitions, type];
          this.draftTypes = this.sortTypes(this.entityTypeDefinitions).map((item) =>
            this.draftType(item),
          );
          this.newType = {
            singularName: '',
            pluralName: '',
            description: '',
            key: '',
            icon: '',
            colorToken: 'slate',
            baseKind: 'WORK',
            status: 'ACTIVE',
          };
          this.savingType = false;
          this.creatingType = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.savingType = false;
          this.typeError = error?.error?.message ?? 'No se pudo crear el tipo.';
          this.cdr.markForCheck();
        },
      });
  }

  scrollToSection(sectionId: DashboardSectionId) {
    this.shell.selectSection(sectionId);
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.cdr.markForCheck();
  }

  get entityTypeLabel(): string {
    return this.draftTypes.find((item) => item.type === this.form.type)?.label ?? this.form.type;
  }

  private draftType(type: EntityTypeDefinition) {
    const visual = getEntityTypeConfig(type.key);
    return {
      type: type.key,
      label: type.singularName,
      description: type.description || '',
      icon: type.icon || visual.icon,
      color: this.colorValue(type.colorToken, visual.color),
    };
  }

  private sortTypes(types: EntityTypeDefinition[]) {
    const systemOrder = [
      'ARTWORK',
      'ARTIST',
      'ARTICLE',
      'CONCEPT',
      'MOVEMENT',
      'PERIOD',
      'PLACE',
      'TEXT',
      'EVENT',
      'ORGANIZATION',
    ];
    return [...types].sort((left, right) => {
      const leftRank = left.systemType ? systemOrder.indexOf(left.key) : systemOrder.length;
      const rightRank = right.systemType ? systemOrder.indexOf(right.key) : systemOrder.length;
      return leftRank - rightRank || left.singularName.localeCompare(right.singularName, 'es');
    });
  }

  private colorValue(token: string, fallback: string) {
    return (
      (
        {
          slate: '#8d939f',
          blue: '#62b5ef',
          coral: '#ec8e77',
          orange: '#d98449',
          green: '#58c78d',
          violet: '#a57be4',
          gold: '#d8ab43',
          teal: '#54c2ce',
          rose: '#d585b8',
        } as Record<string, string>
      )[token] ?? fallback
    );
  }

  slugify(value: string): string {
    return value
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
    return false;
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
