import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CuratedDeck } from '../../core/api/curated.api';
import { I18nService } from '../../core/i18n/i18n.service';
import { RecommendedEntityShelfComponent } from './recommended-entity-shelf.component';

@Component({
  standalone: true,
  selector: 'app-recommended-recently-added',
  imports: [RecommendedEntityShelfComponent],
  templateUrl: './recommended-recently-added.component.html',
  styleUrl: './recommended-recently-added.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedRecentlyAddedComponent {
  readonly i18n = inject(I18nService);
  items = input<CuratedDeck[]>([]);
}
