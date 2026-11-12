import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { externalSourceLink } from './external-source-link';

@Component({
  selector: 'app-knowledge-source',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h3>{{ title() }}</h3>
    <ng-content />
    @if (link(); as link) {
      <a
        [href]="link.href"
        target="_blank"
        rel="noopener noreferrer"
        [attr.aria-label]="
          i18n.t('research.publication.openSource') +
          ': ' +
          title() +
          ' · ' +
          i18n.t('source.opensNewTab')
        "
        >{{ i18n.t('research.publication.openSource') }} ↗</a
      >
    }`,
  styleUrls: ['./knowledge-discovery-surfaces.scss'],
  styles: [
    `
      :host {
        display: block;
        padding: 20px 0 20px 8px;
        border-bottom: 1px solid var(--knowledge-border);
      }
      h3 {
        margin: 0;
        font-size: 18px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }
      a {
        display: inline-block;
        padding-block: 10px;
        color: inherit;
        font-size: 16px;
      }
      a:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 3px;
      }
    `,
  ],
})
export class KnowledgeSourceComponent {
  readonly i18n = inject(I18nService);
  readonly title = input.required<string>();
  readonly url = input<string | null | undefined>(null);
  readonly link = computed(() => externalSourceLink(this.url()));
}
