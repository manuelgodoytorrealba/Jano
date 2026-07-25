import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ResearchDecision,
  ResearchDecisionAction,
  ResearchEvidence,
  ResearchFinding,
  ResearchFindingStatus,
  ResearchProject,
  ResearchProjectSource,
  PromoteResearchFindingPayload,
  ResearchSourceRecord,
} from '../../../core/api/research.api';

@Component({
  standalone: true,
  selector: 'app-research-findings-section',
  imports: [DatePipe, FormsModule],
  templateUrl: './research-findings-section.component.html',
  styleUrl: './research-findings-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchFindingsSectionComponent {
  @Input({ required: true }) project!: ResearchProject;
  @Input() actionBusy = false;
  @Input() decisionNotes: Record<string, string> = {};

  @Output() decisionNoteChange = new EventEmitter<{ findingId: string; note: string }>();
  @Output() decide = new EventEmitter<{ findingId: string; action: ResearchDecisionAction }>();
  @Output() promote = new EventEmitter<{
    findingId: string;
    data: PromoteResearchFindingPayload;
  }>();

  promotionDrafts: Record<string, PromoteResearchFindingPayload> = {};

  readonly decisionActions: ResearchDecisionAction[] = ['INCORPORATE', 'REJECT', 'POSTPONE'];

  promotionDraft(finding: ResearchFinding): PromoteResearchFindingPayload {
    return (
      this.promotionDrafts[finding.id] ??
      (this.promotionDrafts[finding.id] = { type: 'CONCEPT', kind: 'ABSTRACTION', slug: '' })
    );
  }

  promoteFinding(finding: ResearchFinding): void {
    const data = this.promotionDraft(finding);
    if (!data.slug.trim()) return;
    this.promote.emit({ findingId: finding.id, data: { ...data, slug: data.slug.trim() } });
  }

  findingStatusLabel(status: ResearchFindingStatus | string | null | undefined): string {
    const labels: Record<string, string> = {
      PROPOSED: 'Propuesta',
      ACCEPTED: 'Aceptada',
      REJECTED: 'Rechazada',
      POSTPONED: 'Pospuesta',
    };
    return labels[(status ?? '').toUpperCase()] ?? 'Hallazgo';
  }

  decisionActionLabel(action: ResearchDecisionAction | string | null | undefined): string {
    const labels: Record<string, string> = {
      INCORPORATE: 'Incorporar',
      REJECT: 'Rechazar',
      POSTPONE: 'Posponer',
    };
    return labels[(action ?? '').toUpperCase()] ?? 'Decisión';
  }

  evidenceSourceTitle(evidence: ResearchEvidence): string {
    const item = this.project.sources.find((source) => source.sourceId === evidence.sourceId);
    return item ? this.sourceTitle(item) : 'Fuente asociada';
  }

  findingEvidence(finding: ResearchFinding): ResearchEvidence[] {
    return (finding.evidence ?? [])
      .map(
        (item) =>
          item.evidence ??
          this.project.evidence.find((evidence) => evidence.id === item.evidenceId),
      )
      .filter((evidence): evidence is ResearchEvidence => Boolean(evidence));
  }

  visibleFindingEvidence(finding: ResearchFinding): ResearchEvidence[] {
    return this.findingEvidence(finding).slice(0, 3);
  }

  hiddenFindingEvidenceCount(finding: ResearchFinding): number {
    return Math.max(0, this.findingEvidence(finding).length - 3);
  }

  decisionsForFinding(findingId: string): ResearchDecision[] {
    return this.project.decisions
      .filter((decision) => decision.findingId === findingId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  private sourceTitle(item: ResearchProjectSource): string {
    const source = item.source;
    if (!source) return 'Fuente asociada';
    return this.sourceRecordLabel(source);
  }

  private sourceRecordLabel(source: ResearchSourceRecord): string {
    return source.author ? `${source.title} · ${source.author}` : source.title;
  }
}
