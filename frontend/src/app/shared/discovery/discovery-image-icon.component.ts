import { ChangeDetectionStrategy, Component } from '@angular/core';
import { entitySymbol } from '../entity-symbols';

@Component({
  selector: 'app-discovery-image-icon',
  standalone: true,
  template: `<svg class="work" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="path" /></svg
    ><svg class="plus" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2 6h8" /></svg>`,
  styles: [
    `
      :host {
        position: relative;
        display: inline-flex;
        width: 23px;
        height: 23px;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      svg {
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .work {
        width: 20px;
        height: 20px;
        stroke-width: 2.35;
      }
      .plus {
        position: absolute;
        right: -4px;
        top: -4px;
        width: 11px;
        height: 11px;
        stroke-width: 2.6;
        border-radius: 50%;
        background: var(--color-surface-strong);
        box-shadow: 0 0 0 1.5px var(--color-surface-strong);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoveryImageIconComponent {
  readonly path = entitySymbol('ARTWORK', 'WORK').path;
}
