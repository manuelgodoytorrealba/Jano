import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ResearchApi } from '../../../core/api/research.api';
import { ResearchEvidenceCaptureComponent } from './research-evidence-capture.component';

const source = {
  projectId: 'research-1',
  sourceId: 'source-1',
  note: 'Catálogo razonado',
  createdAt: '2026-07-31T10:00:00.000Z',
  source: {
    id: 'source-1',
    type: 'BOOK',
    title: 'Goya',
    author: null,
    publisher: null,
    year: null,
    url: null,
    createdAt: '2026-07-31T10:00:00.000Z',
  },
};

const searchResult = {
  id: 'source-2',
  type: 'ARTICLE',
  title: 'El Prado y Goya',
  author: 'María Pérez',
  publisher: null,
  year: 2024,
  url: null,
  createdAt: '2026-07-31T10:00:00.000Z',
};

function createApi() {
  return {
    createEvidence: vi.fn().mockReturnValue(of({ id: 'research-1' })),
    searchSources: vi.fn().mockReturnValue(of([])),
    addSource: vi.fn().mockReturnValue(of({ id: 'research-1' })),
  };
}

async function createFixture(api = createApi()) {
  await TestBed.configureTestingModule({
    imports: [ResearchEvidenceCaptureComponent],
    providers: [{ provide: ResearchApi, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchEvidenceCaptureComponent);
  fixture.componentRef.setInput('researchId', 'research-1');
  fixture.componentRef.setInput('sources', [source]);
  fixture.componentRef.setInput('evidence', []);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, api };
}

describe('ResearchEvidenceCaptureComponent', () => {
  it('uses an associated Source to create manual Evidence and emits a refresh', async () => {
    const { fixture, api } = await createFixture();
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.selectSource('source-1');
    fixture.componentInstance.sourceVersion = '1.ª edición';
    fixture.componentInstance.locator = 'p. 42';
    fixture.componentInstance.quote = 'Una cita verificable';
    fixture.componentInstance.save();

    expect(api.createEvidence).toHaveBeenCalledWith('research-1', {
      sourceId: 'source-1',
      sourceVersion: '1.ª edición',
      locator: 'p. 42',
      quote: 'Una cita verificable',
      context: undefined,
      note: undefined,
    });
    expect(saved).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.locator).toBe('');
    expect(fixture.componentInstance.quote).toBe('');
  });

  it('searches existing Sources with ResearchApi.searchSources', async () => {
    const { fixture, api } = await createFixture();
    api.searchSources.mockReturnValue(of([searchResult]));
    fixture.componentInstance.sourceSearch = '  Prado  ';
    fixture.componentInstance.searchSources();

    expect(api.searchSources).toHaveBeenCalledWith('Prado');
    expect(fixture.componentInstance.sourceResults).toEqual([searchResult]);
  });

  it('associates a selected Source with its optional note and keeps it ready for Evidence', async () => {
    const { fixture, api } = await createFixture();
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.selectSearchResult(searchResult);
    fixture.componentInstance.sourceNote = 'Contexto para el capítulo primero';
    fixture.componentInstance.associateSource();

    expect(api.addSource).toHaveBeenCalledWith('research-1', {
      sourceId: 'source-2',
      note: 'Contexto para el capítulo primero',
    });
    expect(saved).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.sourceId).toBe('source-2');

    fixture.componentInstance.sourceVersion = 'Consulta 2026';
    fixture.componentInstance.locator = 'apartado 3';
    fixture.componentInstance.quote = 'Pasaje disponible para revisión';
    fixture.componentInstance.save();
    expect(api.createEvidence).toHaveBeenCalledWith(
      'research-1',
      expect.objectContaining({ sourceId: 'source-2' }),
    );
  });

  it('does not submit blank searches, unselected Sources, duplicate Sources, or incomplete Evidence', async () => {
    const { fixture, api } = await createFixture();
    fixture.componentInstance.sourceSearch = '   ';
    fixture.componentInstance.searchSources();
    fixture.componentInstance.associateSource();
    fixture.componentInstance.selectSearchResult(source.source);
    fixture.componentInstance.associateSource();
    fixture.componentInstance.selectSource('source-1');
    fixture.componentInstance.save();

    expect(api.searchSources).not.toHaveBeenCalled();
    expect(api.addSource).not.toHaveBeenCalled();
    expect(api.createEvidence).not.toHaveBeenCalled();
  });
});
