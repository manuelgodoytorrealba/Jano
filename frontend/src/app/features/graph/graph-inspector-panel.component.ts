import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { GraphNode, GraphTypeMeta } from './graph.models';

@Component({
  standalone: true,
  selector: 'app-graph-inspector-panel',
  imports: [CommonModule],
  templateUrl: './graph-inspector-panel.component.html',
  styleUrl: './graph-inspector-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphInspectorPanelComponent {
  @Input() selectedNode: GraphNode | null = null;
  @Input() selectedNodeMeta: GraphTypeMeta | null = null;
  @Input() imageSyncActive = false;
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
}
