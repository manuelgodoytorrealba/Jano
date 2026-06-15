import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-entities-list-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="entities-pager entities-pager--in-shell">
      <button class="ds-btn" type="button" (click)="previous.emit()" [disabled]="page <= 1">
        {{ i18n.t('pager.prev') }}
      </button>

      <button class="ds-btn" type="button" (click)="next.emit()" [disabled]="page >= totalPages">
        {{ i18n.t('pager.next') }}
      </button>
    </section>
  `,
  styleUrls: ['./entities-list-pager.component.scss'],
})
export class EntitiesListPagerComponent {
  @Input({ required: true }) page = 1;
  @Input({ required: true }) totalPages = 1;
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  constructor(readonly i18n: I18nService) {}
}
