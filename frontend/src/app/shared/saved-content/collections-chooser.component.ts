import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { SavedCollectionsFacade } from './saved-collections.facade';
@Component({
  selector: 'app-collections-chooser',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './collections-chooser.component.html',
  styleUrl: './collections-chooser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionsChooserComponent {
  @Input({ required: true }) targetId!: string;
  @Input({ required: true }) saved!: SavedCollectionsFacade;
  readonly i18n = inject(I18nService);
}
