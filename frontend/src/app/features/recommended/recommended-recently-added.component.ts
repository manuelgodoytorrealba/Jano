import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CuratedDeck } from '../../core/api/curated.api';
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
  items = input<CuratedDeck[]>([]);
}
