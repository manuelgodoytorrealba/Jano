import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { getRelationTypeConfig } from './graph.config';
import { GraphEdge, GraphNode, GraphTypeMeta } from './graph.models';

type MobileConnectionItem = {
  edgeId: string;
  relationLabel: string;
  relationColor: string;
  nodeLabel: string;
  nodeTypeLabel: string;
  relationJustification: string | null;
};

type MobileConnectionGroup = {
  type: string;
  typeLabel: string;
  color: string;
  count: number;
  items: MobileConnectionItem[];
};

@Component({
  standalone: true,
  selector: 'app-graph-inspector-panel',
  imports: [CommonModule],
  templateUrl: './graph-inspector-panel.component.html',
  styleUrl: './graph-inspector-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphInspectorPanelComponent {
  readonly i18n = inject(I18nService);
  @Input() isMobileViewport = false;
  @Input() nodeCount = 0;
  @Input() edgeCount = 0;
  @Input() selectedNode: GraphNode | null = null;
  @Input() selectedNodeMeta: GraphTypeMeta | null = null;
  @Input() centerNode: GraphNode | null = null;
  @Input() focusedNodeIsCenter = true;
  @Input() contextualEdges: GraphEdge[] = [];
  @Input() nodeMap: Map<string, GraphNode> = new Map();
  @Input() entityTypes: string[] = [];
  @Input() relationTypes: string[] = [];
  @Input() entityTypeFilters: Record<string, boolean> = {};
  @Input() relationTypeFilters: Record<string, boolean> = {};
  @Input() entityTypeMeta: Record<string, GraphTypeMeta> = {};
  @Input() relationTypeMeta: Record<string, GraphTypeMeta> = {};

  @Output() openSelectedEntity = new EventEmitter<void>();
  @Output() setAllEntityTypes = new EventEmitter<boolean>();
  @Output() toggleEntityType = new EventEmitter<string>();
  @Output() setAllRelationTypes = new EventEmitter<boolean>();
  @Output() toggleRelationType = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  activeEntityTypesCount(): number {
    return this.entityTypes.filter((type) => this.entityTypeFilters[type] !== false).length;
  }

  activeRelationTypesCount(): number {
    return this.relationTypes.filter((type) => this.relationTypeFilters[type] !== false).length;
  }

  mobileTitle(): string {
    if (!this.selectedNode) {
      return this.i18n.t('graph.mapAndFilters');
    }

    return this.focusedNodeIsCenter ? this.i18n.t('graph.entityAndConnections') : this.i18n.t('graph.focusedEntity');
  }

  focusedNodeConnectionCount(): number {
    return this.contextualEdges.length;
  }

  focusedNodeConnectedTypeCount(): number {
    if (!this.selectedNode) {
      return 0;
    }

    return new Set(
      this.contextualEdges
        .map((edge) => this.resolveOtherNode(edge, this.selectedNode!.id)?.type)
        .filter((type): type is string => !!type),
    ).size;
  }

  primaryConnections(): MobileConnectionItem[] {
    if (!this.selectedNode || !this.centerNode || this.focusedNodeIsCenter) {
      return [];
    }

    const normalizedCenterId = this.normalizeNodeId(this.centerNode.id);

    return this.contextualEdges
      .filter(
        (edge) =>
          this.normalizeNodeId(edge.source) === normalizedCenterId || this.normalizeNodeId(edge.target) === normalizedCenterId,
      )
      .map((edge) => this.toConnectionItem(edge, this.selectedNode!.id))
      .filter((item): item is MobileConnectionItem => item !== null);
  }

  otherVisibleConnections(): MobileConnectionItem[] {
    if (!this.selectedNode || this.focusedNodeIsCenter) {
      return [];
    }

    return this.contextualEdges
      .filter((edge) => {
        if (!this.centerNode) {
          return true;
        }

        const normalizedCenterId = this.normalizeNodeId(this.centerNode.id);
        return this.normalizeNodeId(edge.source) !== normalizedCenterId && this.normalizeNodeId(edge.target) !== normalizedCenterId;
      })
      .map((edge) => this.toConnectionItem(edge, this.selectedNode!.id))
      .filter((item): item is MobileConnectionItem => item !== null);
  }

  centerConnectionGroups(): MobileConnectionGroup[] {
    if (!this.selectedNode || !this.focusedNodeIsCenter) {
      return [];
    }

    const groups = new Map<string, MobileConnectionGroup>();

    for (const edge of this.contextualEdges) {
      const otherNode = this.resolveOtherNode(edge, this.selectedNode.id);
      if (!otherNode) {
        continue;
      }

      const typeMeta = this.entityTypeMeta[otherNode.type];
      const group = groups.get(otherNode.type) ?? {
        type: otherNode.type,
        typeLabel: typeMeta?.label ?? otherNode.type,
        color: typeMeta?.color ?? '#94a3b8',
        count: 0,
        items: [],
      };

      const item = this.toConnectionItem(edge, this.selectedNode.id);
      if (!item) {
        continue;
      }

      group.count += 1;
      group.items.push(item);
      groups.set(otherNode.type, group);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((left, right) => left.nodeLabel.localeCompare(right.nodeLabel)),
      }))
      .sort((left, right) => right.count - left.count || left.typeLabel.localeCompare(right.typeLabel));
  }

  previewItems(items: MobileConnectionItem[], limit = 3): MobileConnectionItem[] {
    return items.slice(0, limit);
  }

  hiddenItemsCount(items: MobileConnectionItem[], limit = 3): number {
    return Math.max(0, items.length - limit);
  }

  private resolveOtherNode(edge: GraphEdge, nodeId: string): GraphNode | null {
    const normalizedNodeId = this.normalizeNodeId(nodeId);
    const otherId = this.normalizeNodeId(edge.source) === normalizedNodeId ? edge.target : edge.source;
    const directMatch = this.nodeMap.get(otherId);

    if (directMatch) {
      return directMatch;
    }

    const normalizedOtherId = this.normalizeNodeId(otherId);
    for (const candidate of this.nodeMap.values()) {
      if (this.normalizeNodeId(candidate.id) === normalizedOtherId) {
        return candidate;
      }
    }

    return null;
  }

  private normalizeNodeId(value: unknown): string {
    return String(value ?? '').trim();
  }

  private toConnectionItem(edge: GraphEdge, nodeId: string): MobileConnectionItem | null {
    const otherNode = this.resolveOtherNode(edge, nodeId);
    if (!otherNode) {
      return null;
    }

    const relationMeta = getRelationTypeConfig(edge.relationType);
    const typeMeta = this.entityTypeMeta[otherNode.type];

    return {
      edgeId: edge.id,
      relationLabel: relationMeta.label,
      relationColor: relationMeta.color,
      nodeLabel: otherNode.label,
      nodeTypeLabel: typeMeta?.label ?? otherNode.type,
      relationJustification: edge.justification?.trim() || null,
    };
  }
}
