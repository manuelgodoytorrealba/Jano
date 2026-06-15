export type DashboardSectionId =
  | 'section-content'
  | 'section-media'
  | 'section-preview'
  | 'section-sources'
  | 'section-contributors'
  | 'section-relations';

export type AdminEntitySidebarSectionItem = {
  id: DashboardSectionId;
  label: string;
  count: string | null;
  meta: string;
  statusLabel: string | null;
  statusClass: string;
  isActive: boolean;
};

export type AdminEntitySaveStatusViewModel = {
  label: string;
  className: string;
};

export const ADMIN_ENTITY_DASHBOARD_SECTIONS: Array<{ id: DashboardSectionId; label: string }> = [
  { id: 'section-preview', label: 'Preview Detail' },
  { id: 'section-content', label: 'Global data' },
  { id: 'section-media', label: 'Media library' },
  { id: 'section-sources', label: 'Fuentes' },
  { id: 'section-contributors', label: 'Colaboradores' },
  { id: 'section-relations', label: 'Relaciones' },
];

type SectionStatus = 'error' | 'saving' | 'ready' | 'locked' | null;

type BuildAdminEntitySidebarSectionsInput = {
  activeDashboardSection: DashboardSectionId;
  supportsTypedDetails: boolean;
  isEdit: boolean;
  persistedMediaLinksCount: number;
  sourceRefsCount: number;
  contributorsCount: number;
  relationsCount: number;
  incomingRelationsCount: number;
  contentHasError: boolean;
  contentSaving: boolean;
  mediaHasError: boolean;
  mediaSaving: boolean;
  sourcesHasError: boolean;
  sourcesSaving: boolean;
  contributorsHasError: boolean;
  contributorsSaving: boolean;
  relationsHasError: boolean;
  relationsSaving: boolean;
};

export function buildAdminEntitySidebarSections(
  input: BuildAdminEntitySidebarSectionsInput,
): AdminEntitySidebarSectionItem[] {
  return ADMIN_ENTITY_DASHBOARD_SECTIONS.map((section) => {
    const status = resolveSectionStatus(section.id, input);
    return {
      id: section.id,
      label: section.label,
      count: sectionCount(section.id, input),
      meta: sectionMeta(section.id, input),
      statusLabel: sectionStatusLabel(status),
      statusClass: sectionStatusClass(status),
      isActive: input.activeDashboardSection === section.id,
    };
  });
}

export function buildAdminEntitySaveStatusViewModel(input: {
  saving: boolean;
  entitySaveState: 'idle' | 'saving' | 'saved' | 'error';
  entityLastSavedAt: Date | null;
  isEdit: boolean;
}): AdminEntitySaveStatusViewModel {
  if (input.saving || input.entitySaveState === 'saving') {
    return {
      label: 'Guardando cambios...',
      className: 'entity-save-status entity-save-status--saving',
    };
  }

  if (input.entitySaveState === 'saved') {
    return {
      label: input.entityLastSavedAt
        ? `Guardado a las ${input.entityLastSavedAt.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}`
        : 'Guardado',
      className: 'entity-save-status entity-save-status--saved',
    };
  }

  if (input.entitySaveState === 'error') {
    return {
      label: 'El último guardado falló',
      className: 'entity-save-status entity-save-status--error',
    };
  }

  return {
    label: input.isEdit ? 'Listo para guardar' : 'Crea la entity para activar el resto',
    className: 'entity-save-status',
  };
}

function sectionCount(sectionId: DashboardSectionId, input: BuildAdminEntitySidebarSectionsInput): string | null {
  switch (sectionId) {
    case 'section-content':
      return input.supportsTypedDetails ? 'Base + ficha' : 'Base';
    case 'section-media':
      return input.isEdit ? String(input.persistedMediaLinksCount) : '—';
    case 'section-preview':
      return 'Detail';
    case 'section-sources':
      return input.isEdit ? String(input.sourceRefsCount) : '—';
    case 'section-contributors':
      return input.isEdit ? String(input.contributorsCount) : '—';
    case 'section-relations':
      return input.isEdit ? String(input.relationsCount + input.incomingRelationsCount) : '—';
  }
}

function sectionMeta(sectionId: DashboardSectionId, input: BuildAdminEntitySidebarSectionsInput): string {
  switch (sectionId) {
    case 'section-content':
      return input.supportsTypedDetails
        ? 'Contenido principal y ficha específica'
        : 'Contenido principal de la entity';
    case 'section-media':
      return input.isEdit
        ? `${input.persistedMediaLinksCount} assets cargados`
        : 'Guarda la entity para habilitar media';
    case 'section-preview':
      return 'Vista pública compuesta';
    case 'section-sources':
      return input.isEdit
        ? `${input.sourceRefsCount} fuentes editoriales`
        : 'Disponible tras guardar';
    case 'section-contributors':
      return input.isEdit
        ? `${input.contributorsCount} créditos y participantes`
        : 'Disponible tras guardar';
    case 'section-relations':
      return input.isEdit
        ? `${input.relationsCount + input.incomingRelationsCount} conexiones registradas`
        : 'Disponible tras guardar';
  }
}

function resolveSectionStatus(
  sectionId: DashboardSectionId,
  input: BuildAdminEntitySidebarSectionsInput,
): SectionStatus {
  switch (sectionId) {
    case 'section-content':
      if (input.contentHasError) return 'error';
      if (input.contentSaving) return 'saving';
      return 'ready';
    case 'section-media':
      if (!input.isEdit) return 'locked';
      if (input.mediaHasError) return 'error';
      if (input.mediaSaving) return 'saving';
      return 'ready';
    case 'section-preview':
      return 'ready';
    case 'section-sources':
      if (!input.isEdit) return 'locked';
      if (input.sourcesHasError) return 'error';
      return input.sourcesSaving ? 'saving' : 'ready';
    case 'section-contributors':
      if (!input.isEdit) return 'locked';
      if (input.contributorsHasError) return 'error';
      return input.contributorsSaving ? 'saving' : 'ready';
    case 'section-relations':
      if (!input.isEdit) return 'locked';
      if (input.relationsHasError) return 'error';
      return input.relationsSaving ? 'saving' : 'ready';
  }
}

function sectionStatusLabel(status: SectionStatus): string | null {
  switch (status) {
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

function sectionStatusClass(status: SectionStatus): string {
  switch (status) {
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
