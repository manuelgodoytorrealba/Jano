import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminEntitySidebarSectionItem, DashboardSectionId } from './admin-entity-shell.presenter';

export type AdminEntityDiscoverabilityItem = {
  label: string;
  detail: string;
  done: boolean;
};

@Component({
  standalone: true,
  selector: 'app-admin-entity-sidebar',
  templateUrl: './admin-entity-sidebar.component.html',
  styleUrls: ['./admin-entity-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntitySidebarComponent {
  @Input() visible = true;
  @Input() isEdit = false;
  @Input() title = '';
  @Input() saveStatusLabel = '';
  @Input() saveStatusClass = 'entity-save-status';
  @Input() cancelHref = '/admin';
  @Input() saveStayLabel = 'Guardar y seguir';
  @Input() saveBackLabel = 'Guardar';
  @Input() saveDisabled = false;
  @Input() loading = false;
  @Input() navItems: AdminEntitySidebarSectionItem[] = [];
  @Input() discoverabilityScoreLabel = '';
  @Input() discoverabilityTone: 'strong' | 'partial' | 'weak' = 'weak';
  @Input() discoverabilitySummary = '';
  @Input() discoverabilityItems: AdminEntityDiscoverabilityItem[] = [];
  @Input() publishWarning: string | null = null;

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() saveStay = new EventEmitter<void>();
  @Output() saveBack = new EventEmitter<void>();
  @Output() selectSection = new EventEmitter<DashboardSectionId>();
}
