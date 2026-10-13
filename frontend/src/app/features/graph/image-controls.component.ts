import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-image-controls',
  templateUrl: './image-controls.component.html',
  styleUrl: './image-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageControlsComponent {
  readonly i18n = inject(I18nService);
  @Input() ready = false;
  @Input() scalePercent = 100;
  @Input() meta: {
    source?: string | null;
    photoBy?: string | null;
    license?: string | null;
  } | null = null;
  @Output() zoom = new EventEmitter<number>();
  @Output() resetView = new EventEmitter<void>();
}
