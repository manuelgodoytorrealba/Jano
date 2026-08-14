import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { ResearchApi, ResearchSourceReference } from '../../core/api/research.api';
import { GraphResponseDto } from '../../core/api/graph.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/i18n.pipe';
import { GraphComponent } from '../graph/graph.component';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';

@Component({
  standalone: true,
  imports: [AsyncPipe, RouterLink, RichTextComponent, TranslatePipe, GraphComponent],
  templateUrl: './research-publication.component.html',
  styleUrl: './research-publication.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchPublicationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ResearchApi);
  private readonly i18n = inject(I18nService);
  readonly activeTab = signal<'content' | 'knowledge-map' | 'entities' | 'sources' | 'related'>(
    'content',
  );
  readonly tabs = [
    { id: 'content' as const, label: 'research.publication.content' },
    { id: 'knowledge-map' as const, label: 'research.publication.knowledgeMap' },
    { id: 'entities' as const, label: 'research.publication.entities' },
    { id: 'sources' as const, label: 'research.publication.sources' },
    { id: 'related' as const, label: 'research.publication.related' },
  ];
  readonly publication$ = this.route.paramMap.pipe(
    switchMap((params) => this.api.getPublished(params.get('id') ?? '')),
  );

  setTab(tab: (typeof this.tabs)[number]['id']): void {
    this.activeTab.set(tab);
  }

  publishedDate(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale(), { dateStyle: 'long' }).format(
      new Date(value),
    );
  }

  sourceMeta(source: ResearchSourceReference): string {
    return [source.author, source.publisher, source.year]
      .filter((item): item is string | number => item !== null && item !== undefined)
      .join(' · ');
  }

  graphData(
    publication: import('../../core/api/research.api').ResearchPublicPublication,
  ): GraphResponseDto {
    return {
      centerId: publication.entities[0]?.id ?? '',
      nodes: publication.entities.map((entity) => ({
        id: entity.id,
        slug: entity.canonicalEntity?.slug ?? entity.id,
        label: entity.canonicalEntity?.title ?? entity.title,
        type: entity.canonicalEntity?.type ?? entity.kind,
        image: entity.canonicalEntity?.imageUrl,
        metadata: { summary: entity.summary },
        state: 'confirmed',
      })),
      edges: publication.relations.map((relation) => ({
        id: relation.id,
        source: relation.fromEntity.id,
        target: relation.toEntity.id,
        relationType: relation.relationType?.label ?? 'RELATED_TO',
        label: relation.relationType?.label ?? this.i18n.t('research.publication.relatedTo'),
        directed: true,
        state: 'confirmed',
      })),
      filters: {
        entityTypes: [
          ...new Set(
            publication.entities.map((entity) => entity.canonicalEntity?.type ?? entity.kind),
          ),
        ],
        relationTypes: [
          ...new Set(
            publication.relations.map((relation) => relation.relationType?.label ?? 'RELATED_TO'),
          ),
        ],
      },
    };
  }
}
