import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, catchError, combineLatest, map, of, startWith } from 'rxjs';
import { AdminEntitiesApi, AdminEntitySearchListItem } from '../../../core/api/admin-entities.api';
import { GraphNodeDto, GraphResponseDto } from '../../../core/api/graph.models';
import { ResearchApi, ResearchProjectSummary } from '../../../core/api/research.api';
import { entityTypeLabel, statusLabel } from '../../../core/i18n/domain-labels';
import { I18nService } from '../../../core/i18n/i18n.service';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { getEntityTypeConfig, getRelationTypeConfig } from '../../graph/graph.config';
import { AdminGlobalGraphComponent } from './admin-global-graph.component';

type WorkspaceSection<T> = {
  state: 'loading' | 'ready' | 'error';
  data: T;
};

type SidebarItem = {
  label: string;
  route: string;
  queryParams?: Record<string, string>;
  count: number | null;
  entityType?: string;
};

type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

type WorkspaceAttentionItem = {
  entity: AdminEntitySearchListItem;
  signals: string[];
};

type WorkspaceRecentSignal = {
  label: string;
  detail: string;
  count: number;
};

type WorkspaceGraphRelation = {
  edgeId: string;
  relationLabel: string;
  relationColor: string;
  node: GraphNodeDto;
  nodeTypeLabel: string;
  nodeColor: string;
};

type WorkspaceGraphCard = {
  title: string;
  subtitle: string;
  graphData: GraphResponseDto;
};

type WorkspaceVm = {
  sidebarGroups: SidebarGroup[];
  recent: WorkspaceSection<AdminEntitySearchListItem[]>;
  research: WorkspaceSection<ResearchProjectSummary[]>;
  attention: WorkspaceAttentionItem[];
  recentSignals: WorkspaceRecentSignal[];
  graph: WorkspaceSection<WorkspaceGraphCard | null>;
};

function sectionState<T>(source: Observable<T>, empty: T): Observable<WorkspaceSection<T>> {
  return source.pipe(
    map((data) => ({ state: 'ready' as const, data })),
    catchError(() => of({ state: 'error' as const, data: empty })),
    startWith({ state: 'loading' as const, data: empty }),
  );
}

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [AsyncPipe, RouterLink, JanoMediaComponent, AdminGlobalGraphComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly adminEntitiesApi = inject(AdminEntitiesApi);
  private readonly researchApi = inject(ResearchApi);
  readonly i18n = inject(I18nService);

  readonly graphExpanded = signal(true);
  readonly graphFocusMode = signal(false);
  readonly leftSidebarVisible = signal(false);
  readonly rightSidebarVisible = signal(true);
  readonly selectedGraphNode = signal<GraphNodeDto | null>(null);

  private readonly recent$ = sectionState(
    this.adminEntitiesApi
      .list({ page: 1, limit: 8, sort: 'updated' })
      .pipe(map((response) => response.items ?? [])),
    [] as AdminEntitySearchListItem[],
  );
  private readonly research$ = sectionState(
    this.researchApi.list().pipe(map((projects) => projects.slice(0, 3))),
    [] as ResearchProjectSummary[],
  );
  private readonly graph$ = sectionState(
    this.adminEntitiesApi.workspaceGraph().pipe(map((graph) => this.buildGraphCard(graph))),
    null,
  );

  readonly vm$ = combineLatest({
    recent: this.recent$,
    research: this.research$,
    graph: this.graph$,
  }).pipe(
    map(({ recent, research, graph }) => {
      const recentEntities = recent.data.slice(0, 5);

      return {
        sidebarGroups: this.sidebarGroups(graph.data?.graphData ?? null),
        recent: { ...recent, data: recentEntities },
        research,
        attention: this.buildAttention(recent.data),
        recentSignals: this.buildRecentSignals(recent.data),
        graph,
      } satisfies WorkspaceVm;
    }),
  );

  selectGraphNode(node: GraphNodeDto | null): void {
    this.selectedGraphNode.set(node);
  }

  entityTypeColor(type: string): string {
    return getEntityTypeConfig(type).color;
  }

  entityTypeIcon(type: string): string {
    return getEntityTypeConfig(type).icon;
  }

  selectedGraphRelations(graph: GraphResponseDto): WorkspaceGraphRelation[] {
    const selected = this.selectedGraphNode();
    if (!selected) return [];

    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    return graph.edges
      .filter((edge) => edge.source === selected.id || edge.target === selected.id)
      .map((edge) => {
        const node = nodes.get(edge.source === selected.id ? edge.target : edge.source);
        if (!node) return null;

        const relationConfig = getRelationTypeConfig(edge.relationType);
        const nodeConfig = getEntityTypeConfig(node.type);
        return {
          edgeId: edge.id,
          relationLabel: relationConfig.label,
          relationColor: relationConfig.color,
          node,
          nodeTypeLabel: nodeConfig.label,
          nodeColor: nodeConfig.color,
        };
      })
      .filter((relation): relation is WorkspaceGraphRelation => relation !== null)
      .sort((left, right) => left.node.label.localeCompare(right.node.label));
  }

  typeLabel(type: string | null | undefined): string {
    return entityTypeLabel(type, this.i18n);
  }

  statusLabel(status: string | null | undefined): string {
    return statusLabel(status, this.i18n);
  }

  researchStatusLabel(status: string | null | undefined): string {
    const key = (status ?? '').toLowerCase();
    return this.i18n.t(
      ['active', 'paused', 'ready_to_decide', 'archived'].includes(key)
        ? `admin.dashboard.researchStatus.${key}`
        : 'admin.dashboard.research',
    );
  }

  statusClass(status: string | null | undefined): string {
    return `workspace-status workspace-status--${(status ?? 'draft').toLowerCase().replace('_', '-')}`;
  }

  relationLabel(count: number): string {
    return `${count} ${this.i18n.t(count === 1 ? 'admin.dashboard.relation' : 'admin.dashboard.relations')}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(this.i18n.locale() === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  researchMeta(project: ResearchProjectSummary): string {
    const counts = project._count;
    if (!counts) return project.scope ?? 'Investigación documental';

    return `${counts.sources} fuentes · ${counts.evidence} evidencias · ${counts.claims} claims`;
  }

  async toggleGraphFocus(graphCard?: HTMLElement): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    this.graphExpanded.set(true);
    if (!graphCard?.requestFullscreen) {
      this.graphFocusMode.set(true);
      return;
    }

    try {
      await graphCard.requestFullscreen();
    } catch {
      this.graphFocusMode.set(true);
    }
  }

  @HostListener('document:fullscreenchange')
  syncGraphFocus(): void {
    this.graphFocusMode.set(
      document.fullscreenElement?.classList.contains('workspace-card--graph') ?? false,
    );
  }

  @HostListener('document:keydown.escape')
  exitGraphFocus(): void {
    if (document.fullscreenElement) void document.exitFullscreen();
    this.graphFocusMode.set(false);
    this.leftSidebarVisible.set(false);
  }

  toggleGraphExpanded(): void {
    this.graphExpanded.update((value) => !value);
  }

  toggleLeftSidebar(): void {
    this.leftSidebarVisible.update((value) => !value);
  }

  toggleRightSidebar(): void {
    this.rightSidebarVisible.update((value) => !value);
  }

  private sidebarGroups(graph: GraphResponseDto | null): SidebarGroup[] {
    const count = (types: string[]) => {
      if (!graph) return null;
      return graph.nodes.filter(
        (node) => !node.id.startsWith('workspace-') && types.includes(node.type.toUpperCase()),
      ).length;
    };

    return [
      {
        label: 'Archivo',
        items: [
          this.sidebarItem('Artistas', 'ARTIST', count(['ARTIST'])),
          this.sidebarItem('Obras', 'ARTWORK', count(['ARTWORK'])),
          this.sidebarItem('Conceptos', 'CONCEPT', count(['CONCEPT'])),
          this.sidebarItem('Movimientos', 'MOVEMENT', count(['MOVEMENT'])),
          this.sidebarItem('Periodos', 'PERIOD', count(['PERIOD'])),
          this.sidebarItem('Lugares', 'PLACE', count(['PLACE'])),
          this.sidebarItem('Artículos', 'ARTICLE', count(['ARTICLE', 'TEXT'])),
        ],
      },
      {
        label: 'Operaciones',
        items: [
          { label: 'Salud del conocimiento', route: '/admin/knowledge-operations', count: null },
        ],
      },
    ];
  }

  private sidebarItem(label: string, entityType: string, count: number | null): SidebarItem {
    return {
      label,
      route: '/admin/entities',
      queryParams: { type: entityType },
      count,
      entityType,
    };
  }

  private buildAttention(items: AdminEntitySearchListItem[]): WorkspaceAttentionItem[] {
    return items
      .map((entity) => ({ entity, signals: this.editorialSignals(entity) }))
      .filter((item) => item.signals.length > 0)
      .slice(0, 4);
  }

  private buildRecentSignals(items: AdminEntitySearchListItem[]): WorkspaceRecentSignal[] {
    const signals = [
      {
        label: 'Piezas recientes',
        detail: 'Muestra ordenada por última edición',
        count: items.length,
      },
      {
        label: 'En revisión',
        detail: 'Requieren decisión editorial',
        count: items.filter((item) => item.status === 'IN_REVIEW').length,
      },
      {
        label: 'Sin imagen',
        detail: 'Necesitan cobertura visual',
        count: items.filter((item) => item.editorialSummary?.visualSource === 'empty').length,
      },
      {
        label: 'Sin fuentes',
        detail: 'Necesitan referencias',
        count: items.filter((item) => item.editorialSummary?.sourcesCount === 0).length,
      },
    ];

    return signals.filter((signal, index) => index === 0 || signal.count > 0);
  }

  private editorialSignals(item: AdminEntitySearchListItem): string[] {
    const summary = item.editorialSummary;
    if (!summary) return [];

    const signals: string[] = [];
    if (summary.visualSource === 'empty') signals.push('Sin imagen');
    if (summary.sourcesCount === 0) signals.push('Sin fuentes');
    if (summary.relationsCount === 0) signals.push('Sin conexiones');

    for (const [locale, status] of Object.entries(summary.translationStatus)) {
      if (status !== 'complete') signals.push(`${locale.toUpperCase()} pendiente`);
    }

    return signals;
  }

  private buildGraphCard(graphData: GraphResponseDto): WorkspaceGraphCard | null {
    const entityCount = graphData.nodes.filter((node) => !node.id.startsWith('workspace-')).length;
    if (!entityCount) return null;

    return {
      title: 'JANO',
      subtitle: `${entityCount} entidades conectadas`,
      graphData,
    };
  }
}
