import type { AdminEntityDiscoverabilityItem } from './admin-entity-sidebar.component';

export type AdminEntityDiscoverabilityModel = {
  items: AdminEntityDiscoverabilityItem[];
  completedCount: number;
  scoreLabel: string;
  tone: 'strong' | 'partial' | 'weak';
  summary: string;
  publishWarning: string | null;
  shouldWarnBeforePublish: boolean;
};

export function buildAdminEntityDiscoverabilityModel(input: {
  hasLanguageBase: boolean;
  aliasesCount: number;
  tagsCount: number;
  structuredFieldCount: number;
  contextCount: number;
  translationCoverage: boolean;
  published: boolean;
}): AdminEntityDiscoverabilityModel {
  const items: AdminEntityDiscoverabilityItem[] = [
    {
      label: 'Lenguaje base',
      detail: input.hasLanguageBase
        ? 'La entity tiene resumen o contenido explicativo.'
        : 'Añade al menos resumen o contenido para describirla mejor.',
      done: input.hasLanguageBase,
    },
    {
      label: 'Aliases de búsqueda',
      detail: input.aliasesCount
        ? `${input.aliasesCount} alias registrados para memoria incompleta o nombres alternativos.`
        : 'Añade 2-6 aliases útiles: nombre común, error frecuente o pista de búsqueda.',
      done: input.aliasesCount > 0,
    },
    {
      label: 'Taxonomía',
      detail: input.tagsCount
        ? `${input.tagsCount} tags conectan esta entity con rutas de descubrimiento.`
        : 'Añade 1-3 tags para materiales, temas, cultura o tipo de objeto.',
      done: input.tagsCount > 0,
    },
    {
      label: 'Detalles estructurados',
      detail: input.structuredFieldCount
        ? `${input.structuredFieldCount} señales estructuradas alimentan el search.`
        : 'Completa materiales, técnica, definición, disciplinas o ubicación según el tipo.',
      done: input.structuredFieldCount > 0,
    },
    {
      label: 'Contexto editorial',
      detail: input.contextCount
        ? `${input.contextCount} conexiones entre relaciones y fuentes refuerzan el contexto.`
        : 'Añade al menos una relación o una fuente para reforzar el contexto.',
      done: input.contextCount > 0,
    },
    {
      label: 'Cobertura bilingüe',
      detail: input.translationCoverage
        ? 'Las traducciones principales ya están presentes.'
        : 'Completa ES y EN para mejorar recall y presentación multilenguaje.',
      done: input.translationCoverage,
    },
  ];
  const completedCount = items.filter((item) => item.done).length;
  const ratio = completedCount / items.length;
  const tone = ratio >= 0.84 ? 'strong' : ratio >= 0.5 ? 'partial' : 'weak';
  const summary =
    tone === 'strong'
      ? 'La entity ya tiene buenas señales para search literal, conceptual y discovery editorial.'
      : tone === 'partial'
        ? 'La base está bien, pero aún faltan algunas señales para búsquedas abstractas y recuperación borrosa.'
        : 'La entity todavía depende demasiado del título exacto. Conviene enriquecerla antes de confiar en el search abstracto.';
  const shouldWarnBeforePublish = completedCount < 4;
  return {
    items,
    completedCount,
    scoreLabel: `${completedCount}/${items.length} listo`,
    tone,
    summary,
    publishWarning:
      input.published && shouldWarnBeforePublish
        ? 'Publicada así seguirá visible, pero su rendimiento en búsquedas vagas o recordadas a medias será limitado.'
        : null,
    shouldWarnBeforePublish,
  };
}
