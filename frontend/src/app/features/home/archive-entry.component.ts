import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EntitiesListComponent } from '../entities/entities-list.component';
import { HomeComponent } from './home.component';

@Component({
  standalone: true,
  imports: [HomeComponent, EntitiesListComponent],
  template: `
    @if (query().keys.length) {
      <app-entities-list />
    } @else {
      <app-home />
    }
  `,
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchiveEntryComponent {
  private readonly route = inject(ActivatedRoute);
  readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
}
