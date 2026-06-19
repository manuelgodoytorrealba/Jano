import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEntity } from '../../core/api/entities.models';
import { recommendedTypeLabel } from './recommended-presenter';

@Component({
  standalone: true,
  selector: 'app-recommended-related-entities',
  imports: [RouterLink],
  templateUrl: './recommended-related-entities.component.html',
  styleUrl: './recommended-related-entities.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedRelatedEntitiesComponent {
  items = input<PublicEntity[]>([]);

  typeLabel(type: string): string {
    return recommendedTypeLabel(type);
  }
}
