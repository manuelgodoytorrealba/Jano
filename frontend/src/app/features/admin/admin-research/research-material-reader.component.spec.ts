import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  ResearchApi,
  ResearchDocument,
  ResearchLibraryExcerpt,
} from '../../../core/api/research.api';
import { ResearchMaterialReaderComponent } from './research-material-reader.component';

const textMaterial: ResearchDocument = {
  id: 'material-text',
  projectId: 'research-1',
  materialVersionId: 'version-1',
  sourceId: 'source-1',
  kind: 'TEXT' as const,
  status: 'READY' as const,
  title: 'Cuaderno de lectura',
  content: 'Un pasaje disponible para lectura completa.',
  url: null,
  originalName: null,
  mimeType: null,
  sizeBytes: null,
  createdAt: '2026-07-31T10:00:00.000Z',
  updatedAt: '2026-07-31T10:00:00.000Z',
};

async function createFixture(materials: ResearchDocument[] = [textMaterial]) {
  const api = {
    createEvidenceFromExcerpt: vi.fn().mockReturnValue(of({})),
    deleteEvidence: vi.fn().mockReturnValue(of({})),
    deleteLibraryExcerpt: vi.fn().mockReturnValue(of({})),
  };
  await TestBed.configureTestingModule({
    imports: [ResearchMaterialReaderComponent],
    providers: [{ provide: ResearchApi, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchMaterialReaderComponent);
  fixture.componentRef.setInput('researchId', 'research-1');
  fixture.componentRef.setInput('materials', materials);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, api };
}

describe('ResearchMaterialReaderComponent', () => {
  it('opens a TEXT material and shows its complete content', async () => {
    const { fixture } = await createFixture();
    expect(fixture.nativeElement.textContent).toContain('Cuaderno de lectura');
    expect(fixture.nativeElement.textContent).toContain(
      'Un pasaje disponible para lectura completa.',
    );
  });

  it('renders existing Library Excerpts as persistent highlights', async () => {
    const { fixture } = await createFixture([
      {
        ...textMaterial,
        content: 'Antes. Un pasaje disponible. Después.',
        excerpts: [
          {
            id: 'excerpt-automatico',
            locator: 'caracteres 1–6',
            text: 'Antes.',
            isHighlight: false,
          },
          {
            id: 'excerpt-1',
            locator: 'caracteres 8–28',
            text: 'Un pasaje disponible.',
            isHighlight: true,
          },
        ],
      },
    ]);

    const highlight = fixture.nativeElement.querySelector('mark.research-reader__highlight');

    expect(highlight.textContent).toBe('Un pasaje disponible.');
    expect(fixture.nativeElement.querySelectorAll('mark.research-reader__highlight')).toHaveLength(
      1,
    );
    expect(fixture.nativeElement.textContent).toContain('1 highlight guardado');
  });

  it('opens the Reader with the native fullscreen API', async () => {
    const { fixture } = await createFixture();
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(fixture.nativeElement, 'requestFullscreen', {
      value: requestFullscreen,
    });

    await fixture.componentInstance.toggleFullscreen();

    expect(requestFullscreen).toHaveBeenCalledWith();
  });

  it('switches between available TEXT materials without writing', async () => {
    const { fixture } = await createFixture([
      textMaterial,
      { ...textMaterial, id: 'material-text-2', title: 'Segunda lectura', content: 'Otro pasaje.' },
    ]);
    const buttons = fixture.nativeElement.querySelectorAll('nav button');
    buttons[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedMaterialId).toBe('material-text-2');
    expect(fixture.nativeElement.textContent).toContain('Otro pasaje.');
  });

  it('allows a prepared URL to be refreshed from the Reader', async () => {
    const { fixture } = await createFixture([
      { ...textMaterial, kind: 'URL', url: 'https://example.com' },
    ]);
    const retry = vi.fn();
    fixture.componentInstance.retryRequested.subscribe(retry);

    fixture.nativeElement.querySelector('.research-reader__document-actions button').click();

    expect(retry).toHaveBeenCalledWith(textMaterial.id);
  });

  it('keeps the selected material visible while it updates', async () => {
    const { fixture } = await createFixture([
      { ...textMaterial, kind: 'URL', status: 'PENDING_PREPARATION' },
      { ...textMaterial, id: 'material-pdf', kind: 'PDF', title: 'Otro material' },
    ]);
    fixture.componentRef.setInput('selectedMaterialId', textMaterial.id);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Actualizando contenido');
    expect(fixture.nativeElement.textContent).toContain('Cuaderno de lectura');
    expect(
      fixture.nativeElement.querySelector('.research-reader__document h3').textContent,
    ).toContain('Cuaderno de lectura');
  });

  it('preserves the material Source when an excerpt leaves the Reader', async () => {
    const { fixture } = await createFixture();
    const created = vi.fn();
    fixture.componentInstance.excerptCreated.subscribe(created);

    fixture.componentInstance.onExcerptCreated(
      { id: 'excerpt-1', locator: 'p. 3', text: 'Pasaje', isHighlight: true },
      textMaterial,
    );

    expect(created).toHaveBeenCalledWith({
      id: 'excerpt-1',
      locator: 'p. 3',
      text: 'Pasaje',
      isHighlight: true,
      sourceId: 'source-1',
    });
  });

  it('converts a selected highlight into evidence', async () => {
    const { fixture, api } = await createFixture([
      {
        ...textMaterial,
        excerpts: [
          {
            id: 'excerpt-1',
            locator: 'caracteres 1–9',
            text: 'Un pasaje',
            isHighlight: true,
          },
        ],
      },
    ]);
    const changed = vi.fn();
    fixture.componentInstance.dataChanged.subscribe(changed);

    fixture.nativeElement
      .querySelector('mark.research-reader__highlight')
      .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 40, clientY: 50 }));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.research-reader__excerpt-menu button').click();
    fixture.detectChanges();
    fixture.componentInstance.evidenceExplanation = 'Demuestra el argumento editorial.';
    fixture.componentInstance.saveEvidence();

    expect(api.createEvidenceFromExcerpt).toHaveBeenCalledWith('research-1', 'excerpt-1', {
      context: expect.any(String),
      note: undefined,
    });
    expect(changed).toHaveBeenCalledWith(undefined);
  });

  it('closes excerpt actions when clicking outside them', async () => {
    const { fixture } = await createFixture([
      {
        ...textMaterial,
        excerpts: [
          { id: 'excerpt-1', locator: 'caracteres 1–9', text: 'Un pasaje', isHighlight: true },
        ],
      },
    ]);
    fixture.componentInstance.openExcerptMenu(
      new MouseEvent('contextmenu', { clientX: 40, clientY: 50 }),
      fixture.componentInstance.selectedMaterial!.excerpts![0],
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.excerptMenu).toMatchObject({ x: 40, y: 50 });
    fixture.componentInstance.closeTransientPanels(new MouseEvent('click'));
    expect(fixture.componentInstance.excerptMenu).toBeNull();
  });

  it('prepares a LibraryExcerpt from text selected inside the Reader', async () => {
    const { fixture } = await createFixture();
    const content = fixture.nativeElement.querySelector('.research-reader__content') as HTMLElement;
    const text = content.querySelector('span')?.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 10);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    content.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectionDraft).toMatchObject({
      locator: 'caracteres 1–9',
      text: 'Un pasaje',
    });
    expect(fixture.nativeElement.textContent).toContain('Crear extracto');

    fixture.nativeElement.querySelector('[aria-label="Descartar selección"]').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectionDraft).toBeNull();

    selection?.addRange(range);
    content.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.research-reader__selection-action button').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('textarea').value).toBe('Un pasaje');
    expect(fixture.nativeElement.textContent).toContain('Cuaderno de lectura');
    expect(fixture.nativeElement.textContent).toContain('Guardar extracto');
  });

  it('focuses a reviewed excerpt in its source material', async () => {
    const { fixture } = await createFixture();
    const excerpt: ResearchLibraryExcerpt = {
      id: 'excerpt-1',
      locator: 'p. 3',
      text: 'Pasaje revisado.',
      isHighlight: true,
      materialVersion: {
        id: 'version-1',
        version: 1,
        material: { id: 'material-text', title: textMaterial.title, source: null },
      },
    };

    fixture.componentRef.setInput('focusExcerpt', excerpt);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedMaterialId).toBe('material-text');
    expect(fixture.nativeElement.textContent).toContain('Pasaje revisado.');
  });

  it('explains when no TEXT material is available and does not expose URL or PDF content', async () => {
    const { fixture } = await createFixture([
      {
        ...textMaterial,
        id: 'material-url',
        kind: 'URL',
        status: 'PENDING_PREPARATION',
        content: null,
      },
      {
        ...textMaterial,
        id: 'material-pdf',
        kind: 'PDF',
        status: 'PENDING_PREPARATION',
        content: 'No leer',
      },
    ]);

    expect(fixture.nativeElement.textContent).toContain(
      'No hay materiales de texto disponibles para lectura.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('No leer');
  });
});
