import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CuratedDeck } from '../../core/api/curated.api';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-recommended-staff-picks',
  imports: [RouterLink],
  templateUrl: './recommended-staff-picks.component.html',
  styleUrl: './recommended-staff-picks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedStaffPicksComponent {
  readonly i18n = inject(I18nService);
  picks = input<CuratedDeck[]>([]);
  readonly selectedIndex = signal(0);
  readonly featuredPick = computed(() => {
    const picks = this.picks();
    if (!picks.length) {
      return null;
    }

    return picks[Math.min(this.selectedIndex(), picks.length - 1)] ?? null;
  });

  selectPick(index: number): void {
    this.selectedIndex.set(index);
  }
}
