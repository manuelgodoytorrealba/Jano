import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  AdminAdditionalMediaItem,
  AdminEntityAliasRecord,
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
import { AdminEntitySidebarComponent } from './admin-entity-sidebar.component';
import { buildAdminEntityDiscoverabilityModel } from './admin-entity-discoverability.presenter';
import {
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
export class AdminEntityFormComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  readonly facade = inject(AdminEntityFormFacade);
  readonly shell = inject(AdminEntityRouteShell);

  activeMediaLibraryView: MediaLibraryViewId = 'coverage';

  submitMode: 'back' | 'stay' = 'back';
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

  form: AdminEntityFormDraft = {
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
    this.shell.initialize();

    if (!this.shell.isEdit || !this.shell.entityId) {
      this.initialEntityHydrated = true;
      return;
    }

    this.loadEntity();
  }

  scrollToSection(sectionId: DashboardSectionId) {
    this.shell.selectSection(sectionId);
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
    this.entityAliases = state.aliases;
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
        this.cdr.markForCheck();
      },
      error: () => {
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
    this.detailsForm = extractEntityDetails(entity);
    this.applyLocalizedDetailTranslations(entity);
    this.sourceRefs = Array.isArray(entity.sourceRefs)
      ? entity.sourceRefs.map((ref) => normalizeSourceRef(ref))
      : [];
    this.contributors = Array.isArray(entity.contributors)
      ? entity.contributors.map((contributor) => normalizeContributor(contributor))
      : [];
    this.entityTags = Array.isArray(entity.tags) ? entity.tags : [];
    this.entityAliases = Array.isArray(entity.aliases) ? entity.aliases : [];
  }

  submit(mode: 'back' | 'stay' = 'back') {
    this.facade.errorMessage.set('');
    this.facade.successMessage.set('');
    this.submitMode = mode;

    const payload = this.buildPayload();

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
        if (entity && this.shell.isEdit) {
          this.applyEntityResponse(entity);
        }

        this.cdr.markForCheck();
        this.shell.navigateAfterSave(mode, entity);
      },
      error: () => {
        this.cdr.markForCheck();
      },
    });
  }

  entitySaveButtonLabel(mode: 'back' | 'stay'): string {
    if (this.facade.saving() && this.submitMode === mode) {
      return 'Guardando...';
    }

    if (this.facade.saveState() === 'saved') {
      return mode === 'stay' ? 'Guardado' : 'Guardar';
    }

    return mode === 'stay' ? 'Guardar y seguir' : 'Guardar';
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

  isActiveSection(sectionId: DashboardSectionId): boolean {
    return this.shell.activeSection === sectionId;
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
    });
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
