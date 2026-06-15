import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MediaCardEditorComponent } from './media-card-editor.component';
import { EditableAdminMediaEditor, EditableAdminMediaLink } from './media-admin.models';
import { AdminEntityMediaEditorPresentation } from './admin-entity-media.presenter';

@Component({
  standalone: true,
  selector: 'app-admin-entity-media-group',
  imports: [MediaCardEditorComponent],
  templateUrl: './admin-entity-media-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityMediaGroupComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) emptyMessage = '';
  @Input({ required: true }) editors: EditableAdminMediaEditor[] = [];
  @Input({ required: true }) activeEditorId: string | null = null;
  @Input() entityTitle = '';
  @Input() hasAnyPersistedLegacyForEditor: (editorId: string) => boolean = () => false;
  @Input() editorPresentationFor: (link: EditableAdminMediaLink) => AdminEntityMediaEditorPresentation = () => ({
    activeSlotLabels: [],
    canIngest: false,
    canPromote: false,
    canRestore: false,
    hasPromotedReplacement: false,
    replacementTargetLabel: null,
    replacementIngestedLabel: null,
    ingestedSourceLabel: null,
    slotWarnings: {},
  });

  @Output() editRequested = new EventEmitter<EditableAdminMediaLink>();
  @Output() assignRole = new EventEmitter<{ link: EditableAdminMediaLink; role: string }>();
  @Output() toggleLegacy = new EventEmitter<EditableAdminMediaLink>();
  @Output() save = new EventEmitter<EditableAdminMediaLink>();
  @Output() discard = new EventEmitter<EditableAdminMediaLink>();
  @Output() remove = new EventEmitter<EditableAdminMediaLink>();
  @Output() ingest = new EventEmitter<EditableAdminMediaLink>();
  @Output() promote = new EventEmitter<EditableAdminMediaLink>();
  @Output() restore = new EventEmitter<EditableAdminMediaLink>();

  presentation(link: EditableAdminMediaLink): AdminEntityMediaEditorPresentation {
    return this.editorPresentationFor(link);
  }
}
