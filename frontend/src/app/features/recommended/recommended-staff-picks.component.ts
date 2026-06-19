import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CuratedDeck } from '../../core/api/curated.api';

@Component({
  standalone: true,
  selector: 'app-recommended-staff-picks',
  imports: [RouterLink],
  templateUrl: './recommended-staff-picks.component.html',
  styleUrl: './recommended-staff-picks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedStaffPicksComponent {
  picks = input<CuratedDeck[]>([]);
}
