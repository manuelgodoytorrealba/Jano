import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminEntitySearchListItem } from '../../../core/api/admin-entities.api';

@Component({
  standalone: true,
  selector: 'app-admin-entity-link-suggestions',
  templateUrl: './admin-entity-link-suggestions.component.html',
  styleUrls: ['./admin-entity-link-suggestions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityLinkSuggestionsComponent {
  @Input() visible = false;
  @Input() loading = false;
  @Input() query = '';
  @Input() items: AdminEntitySearchListItem[] = [];

  @Output() selectItem = new EventEmitter<AdminEntitySearchListItem>();
}
