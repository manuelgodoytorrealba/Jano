import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchiveCardEditorComponent } from './archive-card-editor.component';
import { EntityTypesApi } from '../../core/api/entity-types.api';
import { I18nService } from '../../core/i18n/i18n.service';

describe('Archive card editor', () => {
  const saveArchiveCard = vi.fn();
  beforeEach(async () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    saveArchiveCard.mockReset().mockReturnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [ArchiveCardEditorComponent],
      providers: [
        { provide: EntityTypesApi, useValue: { saveArchiveCard } },
        { provide: I18nService, useValue: { locale: signal('es'), t: (key: string) => key } },
      ],
    }).compileComponents();
  });
  afterEach(() => vi.restoreAllMocks());
  function create() {
    const fixture = TestBed.createComponent(ArchiveCardEditorComponent);
    fixture.componentRef.setInput('type', { key: 'ARTWORK', archiveTitleEs: 'Obras' });
    fixture.componentRef.setInput('image', '/current.jpg');
    fixture.detectChanges();
    return fixture;
  }
  it('accepts picked and dropped images, sends one atomic save and releases previews', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    const file = new File(['image'], 'cover.png', { type: 'image/png' });
    c.choose({ target: { files: [file], value: 'cover.png' } } as unknown as Event);
    expect(c.preview()).toBe('blob:preview');
    const preventDefault = vi.fn();
    c.drop({ preventDefault, dataTransfer: { files: [file] } } as unknown as DragEvent);
    expect(preventDefault).toHaveBeenCalled();
    c.draft.archiveTitleEn = 'Works';
    const saved = vi.fn();
    c.saved.subscribe(saved);
    c.save();
    const [key, data] = saveArchiveCard.mock.calls[0];
    expect(key).toBe('ARTWORK');
    expect(data.get('archiveTitleEs')).toBe('Obras');
    expect(data.get('archiveTitleEn')).toBe('Works');
    expect(data.get('file')).toBe(file);
    expect(saved).toHaveBeenCalled();
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
  it('rejects unsupported or oversized files and preserves the draft on server errors', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.selectFile(new File(['x'], 'x.svg', { type: 'image/svg+xml' }));
    expect(c.error()).toBe('archive.editor.invalidImage');
    expect(c.preview()).toBe('/current.jpg');
    const oversized = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversized, 'size', { value: 16 * 1024 * 1024 });
    c.selectFile(oversized);
    expect(c.error()).toBe('archive.editor.invalidImage');
    saveArchiveCard.mockReturnValue(throwError(() => new Error('offline')));
    c.save();
    expect(c.saving()).toBe(false);
    expect(c.error()).toBe('archive.editor.saveError');
    expect(c.draft.archiveTitleEs).toBe('Obras');
    expect(saveArchiveCard.mock.calls[0][1].has('file')).toBe(false);
  });
});
