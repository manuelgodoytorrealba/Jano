import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PublicEntityPreview } from '../../../core/api/entities.models';

@Component({
  standalone: true,
  selector: 'app-admin-entity-preview-popover',
  templateUrl: './admin-entity-preview-popover.component.html',
  styleUrls: ['./admin-entity-preview-popover.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityPreviewPopoverComponent {
  @Input() visible = false;
  @Input() loading = false;
  @Input() previewData: PublicEntityPreview | null = null;
}
