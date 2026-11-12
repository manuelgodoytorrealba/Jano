import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-connections-invite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button type="button" (click)="open.emit()">
    <span
      >{{ i18n.t('research.publication.exploreConnections')
      }}<small
        >{{ entities() }} {{ i18n.t('research.publication.entities') }} · {{ relations() }}
        {{ i18n.t('research.publication.relations') }}</small
      ></span
    >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M12 8v5M5 17v-4h14v4" />
      <rect x="2" y="17" width="6" height="5" rx="1" />
      <rect x="16" y="17" width="6" height="5" rx="1" />
    </svg>
  </button>`,
  styleUrls: ['./knowledge-discovery-surfaces.scss'],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      button {
        display: flex;
        width: 100%;
        justify-content: space-between;
        text-align: left;
        padding: 18px;
        align-items: center;
        gap: 20px;
        border: 1px solid var(--knowledge-border);
        border-radius: 17px;
        color: inherit;
        font: inherit;
        font-size: 17px;
        cursor: pointer;
        background: var(--knowledge-surface);
      }
      button:hover {
        border-color: currentColor;
      }
      button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 4px;
      }
      small {
        display: block;
        margin-top: 5px;
        color: var(--research-text-soft, var(--color-text-soft));
        font-size: 14px;
      }
      svg {
        flex-shrink: 0;
      }
    `,
  ],
})
export class ConnectionsInviteComponent {
  readonly i18n = inject(I18nService);
  readonly entities = input.required<number>();
  readonly relations = input.required<number>();
  readonly open = output<void>();
}
