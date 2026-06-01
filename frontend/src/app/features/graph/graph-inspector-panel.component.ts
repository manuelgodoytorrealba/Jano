import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
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
  readonly i18n = inject(I18nService);
  @Input() selectedNode: GraphNode | null = null;
  @Input() selectedNodeMeta: GraphTypeMeta | null = null;
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
