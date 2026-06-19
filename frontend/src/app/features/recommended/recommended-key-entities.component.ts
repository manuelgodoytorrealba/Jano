import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEntity } from '../../core/api/entities.models';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { recommendedTypeLabel } from './recommended-presenter';

@Component({
  standalone: true,
  selector: 'app-recommended-key-entities',
  imports: [RouterLink, JanoMediaComponent],
  templateUrl: './recommended-key-entities.component.html',
  styleUrl: './recommended-key-entities.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedKeyEntitiesComponent {
  items = input<PublicEntity[]>([]);

  typeLabel(type: string): string {
    return recommendedTypeLabel(type);
  }
}
