import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ResearchDocument, ResearchLibraryExcerpt } from '../../../core/api/research.api';
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
  await TestBed.configureTestingModule({
    imports: [ResearchMaterialReaderComponent],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchMaterialReaderComponent);
  fixture.componentRef.setInput('researchId', 'research-1');
  fixture.componentRef.setInput('materials', materials);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('ResearchMaterialReaderComponent', () => {
  it('opens a TEXT material and shows its complete content', async () => {
    const fixture = await createFixture();
    expect(fixture.nativeElement.textContent).toContain('Cuaderno de lectura');
    expect(fixture.nativeElement.textContent).toContain(
      'Un pasaje disponible para lectura completa.',
    );
  });

  it('opens the Reader with the native fullscreen API', async () => {
    const fixture = await createFixture();
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(fixture.nativeElement, 'requestFullscreen', {
      value: requestFullscreen,
    });

    await fixture.componentInstance.toggleFullscreen();

    expect(requestFullscreen).toHaveBeenCalledWith();
  });

  it('switches between available TEXT materials without writing', async () => {
    const fixture = await createFixture([
      textMaterial,
      { ...textMaterial, id: 'material-text-2', title: 'Segunda lectura', content: 'Otro pasaje.' },
    ]);
    const buttons = fixture.nativeElement.querySelectorAll('nav button');
    buttons[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedMaterialId).toBe('material-text-2');
    expect(fixture.nativeElement.textContent).toContain('Otro pasaje.');
  });

  it('preserves the material Source when an excerpt leaves the Reader', async () => {
    const fixture = await createFixture();
    const created = vi.fn();
    fixture.componentInstance.excerptCreated.subscribe(created);

    fixture.componentInstance.onExcerptCreated(
      { id: 'excerpt-1', locator: 'p. 3', text: 'Pasaje' },
      textMaterial,
    );

    expect(created).toHaveBeenCalledWith({
      id: 'excerpt-1',
      locator: 'p. 3',
      text: 'Pasaje',
      sourceId: 'source-1',
    });
  });

  it('focuses a reviewed excerpt in its source material', async () => {
    const fixture = await createFixture();
    const excerpt: ResearchLibraryExcerpt = {
      id: 'excerpt-1',
      locator: 'p. 3',
      text: 'Pasaje revisado.',
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
    const fixture = await createFixture([
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
