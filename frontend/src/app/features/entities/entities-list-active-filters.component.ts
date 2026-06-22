import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import {
  EntitiesListActiveFilterChipVm,
  EntitiesListActiveFilterKey,
} from './entities-list.facade';

@Component({
  standalone: true,
  selector: 'app-entities-list-active-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="entities-active-filters">
      @for (chip of chips; track chip.key) {
        <button
          type="button"
          class="search-chip entities-active-filter"
          [class.entities-active-filter--advanced]="chip.advanced"
          (click)="clear.emit(chip.key)"
        >
          <span class="entities-active-filter__content">
            <span class="search-chip__label">{{ chip.label }}</span>
            <span class="search-chip__value">{{ chip.value }}</span>
          </span>
          <span class="entities-active-filter__clear">✕</span>
        </button>
      }
    </div>
  `,
  styleUrls: ['./entities-list-active-filters.component.scss'],
})
export class EntitiesListActiveFiltersComponent {
  @Input({ required: true }) chips: EntitiesListActiveFilterChipVm[] = [];
  @Output() clear = new EventEmitter<EntitiesListActiveFilterKey>();
}
