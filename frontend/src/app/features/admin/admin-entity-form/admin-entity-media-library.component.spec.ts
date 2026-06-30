import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AdminEntityMediaLibraryComponent } from './admin-entity-media-library.component';
import { AdminEntityMediaActions } from './admin-entity-media.actions';
import { EditableAdminMediaEditor, EditableAdminMediaLink } from './media-admin.models';

describe('AdminEntityMediaLibraryComponent', () => {
  it('owns view selection and emits media intents without mutating the editor', () => {
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
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminEntityMediaActions,
          useValue: {
            changes: new Subject(),
            hydrate: () => undefined,
            setVisualState: () => undefined,
            handle: () => undefined,
          },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new AdminEntityMediaLibraryComponent());
    component.mediaEditors = [editor];
    component.persistedMediaLinks = [link];
    component.ngOnChanges();
    component.setView('library');
    component.selectEditor(link);
    expect(component.activeView).toBe('library');
    expect(component.model.activeMediaEditor?.id).toBe('link-1');
    expect(editor.draft.role).toBe('CARD');
  });
});
