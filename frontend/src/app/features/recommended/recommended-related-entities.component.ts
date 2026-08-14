import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEntity } from '../../core/api/entities.models';
import { I18nService } from '../../core/i18n/i18n.service';
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
  readonly i18n = inject(I18nService);
  items = input<PublicEntity[]>([]);

  typeLabel(type: string): string {
    return recommendedTypeLabel(type, this.i18n);
  }
}
