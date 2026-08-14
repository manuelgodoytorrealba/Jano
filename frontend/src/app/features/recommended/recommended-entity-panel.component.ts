import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEntity } from '../../core/api/entities.models';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { CuratedPageTabs } from './recommended-presenter';
import { RecommendedEntityShelfComponent } from './recommended-entity-shelf.component';
import {
  RecommendedTab,
  recommendedEntityDescription,
  recommendedEntityMeta,
  recommendedTypeLabel,
  recommendedTabItems,
} from './recommended-presenter';

@Component({
  standalone: true,
  selector: 'app-recommended-entity-panel',
  imports: [RouterLink, RichTextComponent, RecommendedEntityShelfComponent],
  templateUrl: './recommended-entity-panel.component.html',
  styleUrl: './recommended-entity-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedEntityPanelComponent {
  readonly i18n = inject(I18nService);
  entity = input<PublicEntity | null>(null);
  selectedTab = input<RecommendedTab>('curations');
  tabGroups = input<CuratedPageTabs | null>(null);

  selectedTabChange = output<RecommendedTab>();

  readonly tabs: RecommendedTab[] = ['curations', 'articles', 'artists', 'artworks', 'concepts'];

  description(entity: PublicEntity | null): string | null {
    return recommendedEntityDescription(entity);
  }

  meta(entity: PublicEntity | null): string | null {
    return recommendedEntityMeta(entity);
  }

  typeLabel(type?: string | null): string {
    return recommendedTypeLabel(type ?? 'ENTITY', this.i18n);
  }

  tabLabel(tab: RecommendedTab): string {
    return this.i18n.t(`curated.tab.${tab}`);
  }

  itemsForTab(tab: RecommendedTab) {
    return recommendedTabItems(tab, this.tabGroups());
  }
}
