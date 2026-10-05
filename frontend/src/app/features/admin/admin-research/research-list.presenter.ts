import {
  ResearchClaim,
  ResearchClaimKind,
  ResearchClaimStatus,
  ResearchDecisionAction,
  ResearchDocumentKind,
  ResearchEvidence,
  ResearchJob,
  ResearchProject,
  ResearchProjectSource,
  ResearchProjectSummary,
  ResearchSourceRecord,
} from '../../../core/api/research.api';

export type ResearchEvidenceGroup = {
  sourceId: string;
  title: string;
  evidence: ResearchEvidence[];
};

function label(value: string | null | undefined, labels: Record<string, string>, fallback: string) {
  return labels[(value ?? '').toUpperCase()] ?? fallback;
}

export const statusLabel = (status: string | null | undefined) =>
  label(
    status,
    {
      ACTIVE: 'Activa',
      PAUSED: 'Pausada',
      READY_TO_DECIDE: 'Lista para decidir',
      ARCHIVED: 'Archivada',
    },
    'Investigación',
  );

export const jobTypeLabel = (type: ResearchJob['type'] | string | null | undefined) =>
  label(
    type,
    { PREPARE_SOURCE: 'Preparar fuente', EXTRACT_FINDINGS: 'Extraer hallazgos' },
    'Trabajo',
  );

export const jobStatusLabel = (status: ResearchJob['status'] | string | null | undefined) =>
  label(
    status,
    { QUEUED: 'En cola', RUNNING: 'En curso', SUCCEEDED: 'Completado', FAILED: 'Fallido' },
    'Estado desconocido',
  );

export const proposalReviewStateLabel = (state: string | null | undefined) =>
  label(
    state,
    { PENDING: 'Pendiente', REVIEWED: 'Revisada', REJECTED: 'Rechazada' },
    'Sin revisar',
  );

export const materialKindLabel = (kind: ResearchDocumentKind | string) =>
  ({ TEXT: 'Texto', URL: 'Enlace', PDF: 'PDF' })[kind] ?? 'Material';

export const materialStatusLabel = (status: string) =>
  ({ READY: 'Listo', PENDING_PREPARATION: 'Pendiente de preparación', FAILED: 'Fallido' })[
    status
  ] ?? 'Pendiente';

export const claimKindLabel = (kind: ResearchClaimKind | string) =>
  ({
    ASSERTION: 'Afirmación',
    CONNECTION_HYPOTHESIS: 'Relación provisional',
    CONCEPT: 'Concepto',
    CONTRADICTION: 'Contradicción',
    OPEN_QUESTION: 'Pregunta abierta',
    SYNTHESIS_STATEMENT: 'Afirmación de síntesis',
  })[kind] ?? 'Síntesis';

export const claimStatusLabel = (status: ResearchClaimStatus) =>
  ({
    DRAFT: 'Borrador',
    SUPPORTED: 'Respaldado',
    QUESTIONED: 'Cuestionado',
    CONTRADICTED: 'Contradicho',
  })[status];

export const displayedClaims = (project: ResearchProject): ResearchClaim[] =>
  project.knowledge.claims.filter((claim) => claim.kind !== 'CONNECTION_HYPOTHESIS');

export function materialSize(size: number | null): string {
  if (!size) return '';
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(size / 1024)} KB`;
}

export const aiExecutionStateLabel = (error: string | null | undefined) =>
  error ? 'Fallida' : 'Registrada';

export const hasQueuedJobs = (project: ResearchProject) =>
  project.jobs.some((job) => job.status === 'QUEUED');

export const decisionActionLabel = (action: ResearchDecisionAction | string | null | undefined) =>
  label(
    action,
    { INCORPORATE: 'Incorporar', REJECT: 'Rechazar', POSTPONE: 'Posponer' },
    'Decisión',
  );

export function projectMeta(project: ResearchProjectSummary): string {
  const counts = project._count;
  if (!counts) return project.scope ?? 'Investigación documental';
  return `${counts.materials ?? 0} materiales · ${counts.evidence} evidencias · ${counts.claims ?? 0} síntesis`;
}

export const sourceRecordLabel = (source: ResearchSourceRecord) =>
  source.author ? `${source.title} · ${source.author}` : source.title;

export const sourceTitle = (item: ResearchProjectSource) =>
  item.source ? sourceRecordLabel(item.source) : 'Fuente asociada';

export function projectSourceTitle(project: ResearchProject, sourceId: string): string {
  const item = project.sources.find((source) => source.sourceId === sourceId);
  return item ? sourceTitle(item) : 'Fuente asociada';
}

export const evidenceSourceTitle = (project: ResearchProject, evidence: ResearchEvidence) =>
  projectSourceTitle(project, evidence.sourceId);

export function filterResearchEvidence(
  project: ResearchProject,
  search: string,
  sourceFilter: string,
): ResearchEvidence[] {
  const query = search.trim().toLowerCase();
  return project.evidence.filter((evidence) => {
    if (sourceFilter && evidence.sourceId !== sourceFilter) return false;
    if (!query) return true;

    const source = project.sources.find((item) => item.sourceId === evidence.sourceId)?.source;
    return [
      evidence.quote,
      evidence.locator,
      evidence.sourceVersion,
      evidence.context,
      evidence.note,
      source?.title,
      source?.author,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
}

export function groupEvidenceBySource(
  project: ResearchProject,
  evidenceItems: ResearchEvidence[],
): ResearchEvidenceGroup[] {
  const groups = new Map<string, ResearchEvidence[]>();
  for (const evidence of evidenceItems) {
    groups.set(evidence.sourceId, [...(groups.get(evidence.sourceId) ?? []), evidence]);
  }
  return [...groups.entries()].map(([sourceId, evidence]) => ({
    sourceId,
    title: projectSourceTitle(project, sourceId),
    evidence,
  }));
}

export const evidenceByIds = (project: ResearchProject, ids: string[]) =>
  ids
    .map((id) => project.evidence.find((evidence) => evidence.id === id))
    .filter((evidence): evidence is ResearchEvidence => Boolean(evidence));

export const claimIds = (evidence: ResearchEvidence[]) => evidence.map((item) => item.id);
