import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
@Component({
  selector: 'app-content-actions',
  standalone: true,
  templateUrl: './content-actions.component.html',
  styleUrl: './content-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentActionsComponent {
  @Input() isSaved = false;
  @Input() saveLoading = false;
  @Input() collectionsOpen = false;
  @Output() saveToggle = new EventEmitter<void>();
  @Output() collectionsToggle = new EventEmitter<void>();
  @Output() shareToggle = new EventEmitter<void>();
  readonly i18n = inject(I18nService);
}
