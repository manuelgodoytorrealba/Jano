import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CuratedDeck } from '../../core/api/curated.api';
import { PublicEntity } from '../../core/api/entities.models';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { recommendedEntityMeta, recommendedTypeLabel } from './recommended-presenter';

@Component({
  standalone: true,
  selector: 'app-recommended-entity-shelf',
  imports: [RouterLink, JanoMediaComponent],
  templateUrl: './recommended-entity-shelf.component.html',
  styleUrl: './recommended-entity-shelf.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedEntityShelfComponent {
  items = input<Array<CuratedDeck | PublicEntity>>([]);
  kind = input<'curations' | 'entities'>('entities');
  showNewBadge = input(false);
  layout = input<'shelf' | 'recent'>('shelf');

  @ViewChild('viewport') private viewport?: ElementRef<HTMLDivElement>;

  isDeck(item: CuratedDeck | PublicEntity): item is CuratedDeck {
    return 'entityCount' in item;
  }

  typeLabel(type: string): string {
    return recommendedTypeLabel(type);
  }

  meta(item: PublicEntity): string | null {
    return recommendedEntityMeta(item);
  }

  showShelfControls(): boolean {
    return this.layout() === 'shelf' && this.items().length > 5;
  }

  scrollShelf(direction: 'prev' | 'next'): void {
    const viewport = this.viewport?.nativeElement;
    if (!viewport) {
      return;
    }

    const delta = viewport.clientWidth * 0.88 * (direction === 'next' ? 1 : -1);
    viewport.scrollBy({ left: delta, behavior: 'smooth' });
  }
}
