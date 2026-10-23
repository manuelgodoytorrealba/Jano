import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-loading',
  template: `
    <div class="loading" role="status" aria-live="polite" [class.loading--compact]="compact()">
      <span class="particles" aria-hidden="true">
        @for (particle of [0, 1, 2, 3, 4, 5, 6, 7, 8]; track particle) {
          <b [style.animation-delay.s]="particle * -0.18"></b>
        }</span
      ><span>{{ label() }}</span>
    </div>
    @if (skeleton()) {
      <div class="skeleton" aria-hidden="true">
        @for (row of [1, 2, 3]; track row) {
          <div class="skeleton-row">
            <span class="skeleton-image"></span
            ><span class="skeleton-lines"><i></i><i></i><i></i></span>
          </div>
        }
      </div>
    }
  `,
  styleUrl: './app-loading.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLoadingComponent {
  readonly label = input.required<string>();
  readonly compact = input(false);
  readonly skeleton = input(false);
}
