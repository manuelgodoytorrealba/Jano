import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminEntitySidebarSectionItem, DashboardSectionId } from './admin-entity-shell.presenter';

@Component({
  standalone: true,
  selector: 'app-admin-entity-sidebar',
  templateUrl: './admin-entity-sidebar.component.html',
  styleUrls: ['./admin-entity-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntitySidebarComponent {
  @Input() visible = true;
  @Input() title = '';
  @Input() saveStatusLabel = '';
  @Input() saveStatusClass = 'entity-save-status';
  @Input() cancelHref = '/admin';
  @Input() saveStayLabel = 'Guardar y seguir';
  @Input() saveBackLabel = 'Guardar';
  @Input() saveDisabled = false;
  @Input() loading = false;
  @Input() navItems: AdminEntitySidebarSectionItem[] = [];

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() saveStay = new EventEmitter<void>();
  @Output() saveBack = new EventEmitter<void>();
  @Output() selectSection = new EventEmitter<DashboardSectionId>();
}
