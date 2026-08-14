import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEntity } from '../../core/api/entities.models';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { I18nService } from '../../core/i18n/i18n.service';
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
  readonly i18n = inject(I18nService);
  items = input<PublicEntity[]>([]);

  @ViewChild('viewport') private viewport?: ElementRef<HTMLDivElement>;

  typeLabel(type: string): string {
    return recommendedTypeLabel(type, this.i18n);
  }

  showControls(): boolean {
    return this.items().length > 5;
  }

  scroll(direction: 'prev' | 'next'): void {
    const viewport = this.viewport?.nativeElement;
    if (!viewport) {
      return;
    }

    const delta = viewport.clientWidth * 0.88 * (direction === 'next' ? 1 : -1);
    viewport.scrollBy({ left: delta, behavior: 'smooth' });
  }
}
