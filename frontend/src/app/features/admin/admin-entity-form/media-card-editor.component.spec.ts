import { SimpleChange } from '@angular/core';
import { MediaCardEditorComponent } from './media-card-editor.component';
import { EditableAdminMediaEditor, EditableAdminMediaLink } from './media-admin.models';

describe('MediaCardEditorComponent', () => {
  it('emits a new draft without mutating its input', () => {
    const link: EditableAdminMediaLink = {
      id: 'link-1',
      role: 'CARD',
      sortOrder: 0,
      isPrimary: false,
      displayMode: '',
      focalX: null,
      focalY: null,
      assetFocalX: null,
      assetFocalY: null,
      slotCrops: {
        explorer3d: { x: null, y: null, zoom: null },
        list: { x: null, y: null, zoom: null },
        detail: { x: null, y: null, zoom: null },
        preview: { x: null, y: null, zoom: null },
      },
      media: { id: 'media-1', url: 'https://example.com/image.jpg' },
    };
    const editor: EditableAdminMediaEditor = {
      id: link.id,
      persisted: link,
      draft: link,
      isDirty: false,
      saveState: 'idle',
      errorMessage: '',
      removing: false,
      ingesting: false,
      promoting: false,
      restoring: false,
    };
    const component = new MediaCardEditorComponent();
    component.editor = editor;
    component.ngOnChanges({ editor: new SimpleChange(null, editor, true) });
    let emitted: EditableAdminMediaLink | undefined;
    component.draftChange.subscribe((draft) => (emitted = draft));

    component.updateDraftField('role', 'DETAIL');

    expect(editor.draft.role).toBe('CARD');
    expect(emitted?.role).toBe('DETAIL');
    expect(emitted).not.toBe(editor.draft);
  });
});
