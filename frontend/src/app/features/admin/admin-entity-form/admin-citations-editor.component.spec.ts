import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CitationsApi } from '../../../core/api/citations.api';
import { SourcesApi } from '../../../core/api/sources.api';
import { AdminCitationsEditorComponent } from './admin-citations-editor.component';

describe('AdminCitationsEditorComponent', () => {
  it('attaches evidence to the exact canonical assertion target', () => {
    const citations = {
      create: vi.fn(() =>
        of({
          id: 'citation-1',
          sourceId: 'source-1',
          source: {
            id: 'source-1',
            title: 'Catálogo',
            type: 'BOOK',
            author: null,
            publisher: null,
            year: null,
            url: null,
          },
          stance: 'SUPPORTS',
          locator: null,
          quote: null,
          note: null,
        }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [AdminCitationsEditorComponent],
      providers: [
        { provide: CitationsApi, useValue: citations },
        { provide: SourcesApi, useValue: { search: vi.fn() } },
      ],
    });
    const component = TestBed.createComponent(AdminCitationsEditorComponent).componentInstance;
    component.target = 'attribute';
    component.targetId = 'attribute-1';
    component.selectedSource = {
      id: 'source-1',
      title: 'Catálogo',
      type: 'BOOK',
      author: null,
      publisher: null,
      year: null,
      url: null,
    };

    component.add();

    expect(citations.create).toHaveBeenCalledWith('attribute', 'attribute-1', {
      sourceId: 'source-1',
      stance: 'SUPPORTS',
      locator: undefined,
      quote: undefined,
      note: undefined,
    });
    expect(component.citations).toHaveLength(1);
  });
});
