import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEntityRelationEndpoint } from '../../core/api/entities.models';
import { JanoMediaComponent } from '../media/jano-media.component';

@Component({
  selector: 'app-connection-card',
  standalone: true,
  imports: [RouterLink, JanoMediaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      @if (image() || entity()?.resolvedMedia) {
        <app-jano-media
          [entity]="entity()"
          [media]="{ url: image(), displayMode: 'CONTAIN' }"
          usage="card"
          alt=""
          sizes="(max-width: 800px) 96px, 400px"
          placeholderMode="none"
        />
      }
      <div class="content">
        @if (slug()) {
          <h3>
            <a [routerLink]="['/entity', slug()]">{{ title() }}</a>
          </h3>
        } @else {
          <h3>{{ title() }}</h3>
        }
        @if (summary()) {
          <p>{{ summary() }}</p>
        }
        <ng-content />
      </div>
    </article>
  `,
  styleUrls: ['./knowledge-discovery-surfaces.scss', './connection-card.component.scss'],
})
export class ConnectionCardComponent {
  readonly title = input.required<string>();
  readonly slug = input<string | null>(null);
  readonly summary = input<string | null | undefined>(null);
  readonly image = input<string | null | undefined>(null);
  readonly entity = input<PublicEntityRelationEndpoint | null>(null);
}
