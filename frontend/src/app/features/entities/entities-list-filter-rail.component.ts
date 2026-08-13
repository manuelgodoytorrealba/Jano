import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  EntitiesListActiveFilterKey,
  EntitiesListFilterRailVm,
  FilterMenuKey,
  Level,
  Sort,
  Status,
} from './entities-list.facade';
import { EntitiesListActiveFiltersComponent } from './entities-list-active-filters.component';

@Component({
  standalone: true,
  selector: 'app-entities-list-filter-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EntitiesListActiveFiltersComponent],
  templateUrl: './entities-list-filter-rail.component.html',
  styleUrls: ['./entities-list-filter-rail.component.scss'],
})
export class EntitiesListFilterRailComponent {
  @Input({ required: true }) vm!: EntitiesListFilterRailVm;
  @Input() collapsed = false;
  @Input() simple = false;
  @Input() openFilterMenu: FilterMenuKey | null = null;
  @Input() advancedFiltersOpen = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() clearChip = new EventEmitter<EntitiesListActiveFilterKey>();
  @Output() toggleMenu = new EventEmitter<FilterMenuKey>();
  @Output() selectOption = new EventEmitter<{ key: FilterMenuKey; value: string }>();
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() statusChange = new EventEmitter<Status>();
  @Output() contentLevelChange = new EventEmitter<Level>();
  @Output() toggleAdvancedFilters = new EventEmitter<void>();
  @Output() resetFilters = new EventEmitter<void>();

  constructor(readonly i18n: I18nService) {}
}
