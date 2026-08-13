import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ResearchApi,
  ResearchEntity,
  ResearchOutlineSection,
  ResearchProject,
} from '../../../core/api/research.api';
import { RichTextComponent } from '../../../shared/rich-text/rich-text.component';
import { ResearchGraphComponent } from './research-graph.component';

type PublicationTab = 'content' | 'knowledge-map' | 'entities' | 'sources' | 'related';
type PublicationSection = ResearchOutlineSection & { depth: number };

@Component({
  standalone: true,
  selector: 'app-research-publication-workspace',
  imports: [RouterLink, RichTextComponent, ResearchGraphComponent],
  templateUrl: './research-publication-workspace.component.html',
  styleUrl: './research-publication-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchPublicationWorkspaceComponent {
  private readonly router = inject(Router);
  private readonly researchApi = inject(ResearchApi);

  @Input({ required: true }) project!: ResearchProject;
  @Input() activeTab: PublicationTab = 'content';

  readonly tabs: Array<{ id: PublicationTab; label: string }> = [
    { id: 'content', label: 'Contenido' },
    { id: 'knowledge-map', label: 'Mapa del conocimiento' },
    { id: 'entities', label: 'Entidades' },
    { id: 'sources', label: 'Fuentes' },
    { id: 'related', label: 'Investigaciones relacionadas' },
  ];

  get entities(): ResearchEntity[] {
    return this.project.entities?.length
      ? this.project.entities
      : (this.project.knowledge?.entities ?? []);
  }

  get publicationSections(): PublicationSection[] {
    const sections = [...(this.project.outlineSections ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const byParent = new Map<string | null, ResearchOutlineSection[]>();
    for (const section of sections) {
      const siblings = byParent.get(section.parentSectionId) ?? [];
      siblings.push(section);
      byParent.set(section.parentSectionId, siblings);
    }
    const ordered: PublicationSection[] = [];
    const append = (parentId: string | null, depth: number) => {
      for (const section of byParent.get(parentId) ?? []) {
        ordered.push({ ...section, depth });
        append(section.id, depth + 1);
      }
    };
    append(null, 0);
    return ordered;
  }

  get readingTime(): number {
    const text = [
      this.project.objective,
      ...this.publicationSections.map((item) => this.sectionContent(item)),
    ].join(' ');
    return Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length / 220));
  }

  setTab(tab: PublicationTab): void {
    if (tab === this.activeTab) return;
    void this.router.navigate([], {
      queryParams: { mode: 'publication', publicationTab: tab === 'content' ? null : tab },
      queryParamsHandling: 'merge',
    });
  }

  publish(): void {
    if (!window.confirm('¿Publicar esta investigación? Será visible en Investigaciones.')) return;
    this.researchApi.publish(this.project.id).subscribe((project) => (this.project = project));
  }

  unpublish(): void {
    if (!window.confirm('¿Retirar esta investigación de la publicación? Dejará de ser visible.'))
      return;
    this.researchApi
      .updateProjectStatus(this.project.id, 'ACTIVE')
      .subscribe((project) => (this.project = project));
  }

  sectionContent(section: ResearchOutlineSection): string {
    return (
      section.drafts.find((draft) => !draft.archivedAt)?.currentRevision?.content?.trim() ?? ''
    );
  }

  sourceTitle(source: ResearchProject['sources'][number]): string {
    return source.source?.title ?? 'Fuente sin título';
  }

  sourceMeta(source: ResearchProject['sources'][number]): string {
    return [source.source?.author, source.source?.publisher, source.source?.year]
      .filter((item): item is string | number => item !== null && item !== undefined)
      .join(' · ');
  }

  citationsFor(sourceId: string): ResearchProject['citations'] {
    return (this.project.citations ?? []).filter((citation) => citation.sourceId === sourceId);
  }

  entityHref(entity: ResearchEntity): string | null {
    return entity.canonicalEntityId ? `/admin/entities/${entity.canonicalEntityId}` : null;
  }

  entityType(entity: ResearchEntity): string {
    return entity.canonicalEntity?.type ?? entity.kind;
  }

  entityImage(entity: ResearchEntity): string | null {
    return entity.canonicalEntity?.imageUrl ?? null;
  }

  entityInitial(entity: ResearchEntity): string {
    return entity.title.trim().charAt(0).toUpperCase() || 'J';
  }
}
