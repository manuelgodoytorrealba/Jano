import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-entities-list-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state ds-panel">
      <div class="empty-state__title">{{ i18n.t('explorer.noResults') }}</div>
      <div class="empty-state__text">
        {{ i18n.t('explorer.noResultsHint') }}
      </div>
      <button type="button" class="empty-state__action ds-btn" (click)="returnToDiscovery.emit()">
        {{ i18n.t('explorer.noResultsAction') }}
      </button>
    </div>
  `,
  styleUrls: ['./entities-list-empty-state.component.scss'],
})
export class EntitiesListEmptyStateComponent {
  @Output() returnToDiscovery = new EventEmitter<void>();

  constructor(readonly i18n: I18nService) {}
}
