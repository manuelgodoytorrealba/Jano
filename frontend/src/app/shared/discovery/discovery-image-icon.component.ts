import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-discovery-image-icon',
  standalone: true,
  template: `<svg class="work" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="15.5" cy="8.5" r="1.5" />
      <path d="m3.5 16 4.1-4.1a2 2 0 0 1 2.8 0l8.1 8.1" /></svg
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
export class DiscoveryImageIconComponent {}
